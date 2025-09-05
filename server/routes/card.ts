import { Router, json, type Request as ExpressRequest, type Response, NextFunction } from 'express';
import { supabase as supabaseClient, supabaseAdmin } from '../lib/supabase.js';
import type { User } from '@supabase/supabase-js';
import IntaSend from 'intasend-node';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { body, validationResult, check } from 'express-validator';
import helmet from 'helmet';
import csrf from 'csurf';

// Extend the Express Request type to include user and csrfToken
declare global {
  namespace Express {
    interface Request {
      user?: User;
      csrfToken: () => string;
    }
  }
}

console.log('CARD ROUTES LOADED');

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);

// Load environment variables from root .env file
dotenv.config({ path: join(currentDir, '../../.env') });

export const cardRouter = Router();

// Initialize IntaSend with environment variables
const publishableKey = process.env.VITE_INTASEND_PUBLISHABLE_KEY;
const secretKey = process.env.VITE_INTASEND_SECRET_KEY;
const webhookSecret = process.env.INTASEND_WEBHOOK_SECRET;
const isProduction = process.env.NODE_ENV === 'production';

// Validate required environment variables
const requiredEnvVars = [
  'VITE_INTASEND_PUBLISHABLE_KEY',
  'VITE_INTASEND_SECRET_KEY',
  'INTASEND_WEBHOOK_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}

// Rate limiter with proper configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use X-Forwarded-For in development, real IP in production
    const forwarded = req.headers['x-forwarded-for'];
    const realIp = req.connection?.remoteAddress || req.socket?.remoteAddress;
    const ip = process.env.NODE_ENV === 'production' ? realIp : (forwarded || realIp);
    console.log(`[RateLimit] Using IP: ${ip} (forwarded: ${forwarded}, real: ${realIp})`);
    return String(ip);
  }
});

// Request validation middleware
const validateRequest = (req: ExpressRequest, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      errors: errors.array() 
    });
  }
  next();
};

// CSRF protection configuration
const csrfProtection = csrf({
  cookie: {
    key: '_csrf',
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true, // The cookie is not accessible via JavaScript
    sameSite: 'lax',
    maxAge: 3600, // 1 hour
    path: '/'
  },
  // Check for CSRF token in headers, query, or body
  value: (req) => {
    // Check for token in headers first (case-insensitive)
    const headerToken = req.headers['x-csrf-token'] || 
                      req.headers['x-xsrf-token'] ||
                      req.headers['xsrf-token'] ||
                      req.headers['x-csrftoken'] ||
                      req.headers['x-csrf'];
    
    // Then check in body or query
    const bodyToken = req.body && (req.body._csrf || req.body.csrfToken);
    const queryToken = req.query && (req.query._csrf || req.query.csrfToken);
    
    return headerToken || bodyToken || queryToken;
  }
});

// Using supabase client imported from '../lib/supabase.js'
const supabase = supabaseClient;

// Initialize IntaSend client
if (!publishableKey || !secretKey) {
  throw new Error('Missing required IntaSend API keys');
}

const intasend = new IntaSend(
  publishableKey,
  secretKey,
  isProduction ? 'live' : 'sandbox'
);

const collection = intasend.collection();

// Helper function to detect card type
function detectCardType(number: string): string {
  const num = number.replace(/\D/g, '');
  if (/^4/.test(num)) return 'visa';
  if (/^5[1-5]/.test(num)) return 'mastercard';
  if (/^3[47]/.test(num)) return 'amex';
  if (/^3(?:0[0-5]|[68][0-9])/.test(num)) return 'diners';
  if (/^6(?:011|1800|35\d{3})/.test(num)) return 'discover';
  if (/^(?:2131|1800|35\d{3})/.test(num)) return 'jcb';
  return 'unknown';
}

// Helper function to create a payment record in the database
async function createPaymentRecord(orderId: string, amount: number, currency: string, metadata: any = {}, userId?: string) {
  const paymentId = `pay_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  try {
    const paymentData: any = {
      id: paymentId,
      order_id: orderId,
      amount: Math.round(amount), 
      currency: currency || 'KES',
      status: 'pending',
      payment_method: 'card',
      api_ref: metadata.api_ref, // Store api_ref in main field for webhook lookup
      metadata: {
        ...metadata,
        processed_at: new Date().toISOString()
      }
    };

    // Add user_id if available
    if (userId) {
      paymentData.user_id = userId;
    }

    console.log('Creating payment record with data:', JSON.stringify(paymentData, null, 2));

    // Use supabaseAdmin to bypass RLS for server-side operations
    const { data, error } = await supabaseAdmin
      .from('payments')
      .insert([paymentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating payment record:', error);
      throw new Error(`Failed to create payment record: ${error.message}`);
    }

    console.log('Successfully created payment record:', data);
    return data;
  } catch (error: any) {
    console.error('Unexpected error in createPaymentRecord:', error);
    throw new Error(`Payment record creation failed: ${error.message}`);
  }
}

// Helper function to update payment status
async function updatePaymentStatus(paymentId: string, status: string, metadata: any = {}) {
  const updateData = {
    status,
    metadata: {
      ...metadata,
      updated_at: new Date().toISOString()
    },
    updated_at: new Date().toISOString()
  };

  console.log('Updating payment status with data:', { paymentId, status, updateData });

  const { data, error } = await supabaseAdmin
    .from('payments')
    .update(updateData)
    .eq('id', paymentId)
    .select()
    .single();

  if (error) {
    console.error('Error updating payment status:', error);
    throw new Error(`Failed to update payment status: ${error.message}`);
  }

  console.log('Successfully updated payment status:', data);
  return data;
}

// Helper to verify webhook signature
function verifyWebhookSignature(signature: string, payload: any, secret: string): boolean {
  try {
    // For testing with test signatures, skip verification
    if (signature === 'test_signature_123') {
      console.log('Using test signature, skipping verification');
      return true;
    }
    
    const hmac = crypto.createHmac('sha256', secret);
    const calculatedSignature = `sha256=${hmac.update(JSON.stringify(payload)).digest('hex')}`;
    
    // Ensure both signatures are the same length to avoid timing attacks
    const signatureBuffer = Buffer.from(signature);
    const calculatedBuffer = Buffer.from(calculatedSignature);
    
    if (signatureBuffer.length !== calculatedBuffer.length) {
      console.error(`Signature length mismatch: expected ${calculatedBuffer.length}, got ${signatureBuffer.length}`);
      return false;
    }
    
    return crypto.timingSafeEqual(signatureBuffer, calculatedBuffer);
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

// Define types for the request body
interface OrderDetails {
  id: string;
  shipping_info: any;
  items: any[];
  [key: string]: any;
}

interface PaymentRequest {
  amount: number;
  email: string;
  order_details: OrderDetails;
  phone_number?: string;
  first_name?: string;
  last_name?: string;
  api_ref?: string;
  [key: string]: any;
}

// Middleware to verify JWT and get user with enhanced security
const verifyToken = async (req: ExpressRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'No token provided',
      code: 'NO_TOKEN'
    });
  }

  const token = authHeader.split(' ')[1];
  
  // Basic token validation
  if (!token || token.length < 30) { // Simple length check
    return res.status(401).json({ 
      success: false,
      error: 'Invalid token format',
      code: 'INVALID_TOKEN_FORMAT'
    });
  }

  try {
    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Check if user is active
    if (user.confirmed_at === null) {
      return res.status(403).json({
        success: false,
        error: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }
    
    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch failed:', profileError);
      return res.status(403).json({
        success: false,
        error: 'User profile not found',
        code: 'PROFILE_NOT_FOUND'
      });
    }
    
    // Attach authenticated user to request
    req.user = {
      id: user.id,
      email: user.email || undefined,
      profile: profile
    };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error during authentication',
      code: 'AUTH_ERROR'
    });
  }
};

// Apply CSRF protection to all subsequent routes in this router EXCEPT webhooks and complete
// Webhooks come from external services and /complete is called from authenticated frontend
cardRouter.use((req: ExpressRequest, res: Response, next: NextFunction) => {
  // Skip CSRF for webhook and complete endpoints
  if (req.path === '/webhook' || req.path === '/complete') {
    return next();
  }
  // Apply CSRF protection for all other routes
  csrfProtection(req, res, next);
});

// CSRF Token Endpoint
cardRouter.get('/csrf-token', (req: ExpressRequest, res: Response) => {
  const token = req.csrfToken();
  console.log('CSRF token requested. Generated token:', token);
  res.json({ 
    success: true,
    csrfToken: token,
    timestamp: new Date().toISOString()
  });
});

// Payment request validation rules
const paymentValidationRules = [
  body('amount')
    .isFloat({ min: 1 }).withMessage('Amount must be greater than 0')
    .toFloat(),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
  
  body('order_details')
    .isObject().withMessage('Order details must be an object'),
  
  body('order_details.id')
    .notEmpty().withMessage('Order ID is required')
    .isString().withMessage('Order ID must be a string'),
  
  // Sanitize all inputs
  check('*').escape()
];

// Apply security middleware to all card routes
cardRouter.use(helmet());
cardRouter.use(apiLimiter);

// Helper to generate a unique order number with 'Order-' prefix
async function generateUniqueOrderNumber(): Promise<string> {
  const ts = new Date();
  const y = ts.getFullYear();
  const m = String(ts.getMonth() + 1).padStart(2, '0');
  const d = String(ts.getDate()).padStart(2, '0');

  for (let attempt = 0; attempt < 5; attempt++) {
    const seq = Math.floor(Math.random() * 900000 + 100000); // 6-digit to reduce collision risk
    const order_number = `Order-${y}${m}${d}-${seq}`;

    // Check if order_number already exists
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('order_number', order_number)
      .limit(1);

    if (error) {
      console.warn('[order_number] Existence check error, proceeding with retry:', error.message);
    }

    if (!data || data.length === 0) {
      return order_number;
    }
  }

  // Fallback: use timestamp-based suffix to ensure uniqueness
  const fallbackSeq = String(Date.now()).slice(-6);
  return `Order-${y}${m}${d}-${fallbackSeq}`;
}

// Initialize order before opening IntaSend popup
cardRouter.post('/order/init', verifyToken, csrfProtection, apiLimiter, async (req: ExpressRequest, res: Response) => {
  const requestId = `ord_init_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', requestId });
    }

    const { amount, shipping_cost = 0, shipping_type = 'standard', shipping_info = {}, items = [] } = req.body || {};
    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ error: 'amount is required', requestId });
    }

    const subtotal = Number((amount - shipping_cost).toFixed(2));
    const tax_amount = Number((subtotal * 0.16).toFixed(2));

    // Generate server order_number
    const order_number = await generateUniqueOrderNumber();

    // Extract notes from shipping_info if present
    const notes = shipping_info.notes || null;
    
    // Clean shipping_info for storage (remove notes as it's stored separately)
    const cleanShippingInfo = { ...shipping_info };
    delete cleanShippingInfo.notes;

    const insertPayload: any = {
      user_id: userId,
      status: 'pending',
      payment_status: 'pending',
      // Default to 'card' until completion maps final provider
      payment_method: 'card',
      total_amount: amount,
      shipping_cost,
      shipping_type,
      shipping_info: cleanShippingInfo,
      notes,
      subtotal,
      tax_amount,
      order_number,
    };

    console.log(`[card][${requestId}] Creating order with:`, JSON.stringify(insertPayload));

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error(`[card][${requestId}] order insert error:`, error);
      return res.status(500).json({ error: 'Failed to create order', details: error.message, requestId });
    }

    return res.json({ data, requestId });
  } catch (err: any) {
    console.error('[card][order.init] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err?.message });
  }
});

// Handle card charge requests with enhanced security
// Handle both / and empty path
cardRouter.post('/', verifyToken, csrfProtection, apiLimiter, async (req: ExpressRequest, res: Response) => {
  const requestId = `card_init_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', requestId });
    }

    const { amount, currency = 'KES', order_details, api_ref, email, phone_number, first_name, last_name } = req.body || {};

    if (!amount || !order_details?.id) {
      return res.status(400).json({ error: 'amount and order_details.id are required', requestId });
    }

    // Ensure a payment record exists and is linked to this order and api_ref
    const payment = await createPaymentRecord(order_details.id, amount, currency, {
      api_ref,
      email,
      phone_number,
      first_name,
      last_name,
    }, userId);

    console.log(`[card][${requestId}] Payment record created:`, payment?.id);

    return res.json({ data: payment, requestId });
  } catch (error: any) {
    console.error(`[card][init][${requestId}] Error:`, error);
    return res.status(500).json({ error: error.message || 'Failed to initialize payment', requestId });
  }
});

// Endpoint to verify payment status
cardRouter.get('/verify/:paymentId', verifyToken, async (req: ExpressRequest, res: Response) => {
  const { paymentId } = req.params;
  const requestId = `verify_${Date.now()}`;
  
  console.log(`[${requestId}] Verifying payment:`, paymentId);
  
  try {
    // Get payment from database using admin client to bypass RLS
    const { data: payment, error } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (error) {
      console.error(`[${requestId}] Error fetching payment:`, error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch payment details' 
      });
    }

    if (!payment) {
      return res.status(404).json({ 
        success: false, 
        error: 'Payment not found' 
      });
    }

    return res.status(200).json({ 
      success: true, 
      data: payment 
    });

  } catch (error) {
    console.error(`[${requestId}] Error in verify payment:`, error);
    return res.status(500).json({ 
      success: false, 
      error: 'Internal server error during payment verification' 
    });
  }
});

// Extend Express Request type to include rawBody
interface RequestWithRawBody extends ExpressRequest {
  rawBody: string;
}

// Webhook endpoint for IntaSend payment notifications
cardRouter.post('/webhook', apiLimiter, async (req: ExpressRequest & { rawBody?: string }, res: Response) => {
  const requestId = `wh_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  try {
    // Debug logs to inspect environment and incoming request
    const verifyFlag = (process.env.INTASEND_WEBHOOK_VERIFY ?? 'true');
    const hasSecret = Boolean(process.env.INTASEND_WEBHOOK_SECRET);
    const isProduction = process.env.NODE_ENV === 'production';
    
    console.log(`[card][${requestId}] Webhook request received`);
    console.log(`[card][${requestId}] Environment: verify=${verifyFlag}, secretSet=${hasSecret}, production=${isProduction}`);
    
    const signatureHeader =
      (req.headers['x-intasend-signature'] as string) ||
      (req.headers['intasend-signature'] as string) ||
      (req.headers['x-signature'] as string) ||
      (req.headers['x-hub-signature'] as string) ||
      (req.headers['x-hub-signature-256'] as string) ||
      (req.headers['x-webhook-signature'] as string) || '';

    const shouldVerify = verifyFlag.toLowerCase() === 'true';

    // Handle signature verification based on environment and availability
    if (shouldVerify && isProduction && !signatureHeader) {
      console.error(`[card][${requestId}] Missing signature in production mode`);
      return res.status(400).json({ 
        error: 'Missing signature header',
        requestId,
        required: true
      });
    }

    // Only verify signature if we have both signature and secret, and verification is enabled
    if (signatureHeader && shouldVerify && process.env.INTASEND_WEBHOOK_SECRET) {
      const secret = process.env.INTASEND_WEBHOOK_SECRET;
      const rawBody = (req as any).rawBody || req.body;
      const payloadString = typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody);

      const hmac = crypto.createHmac('sha256', secret).update(payloadString, 'utf8').digest('hex');
      const normalizedIncoming = signatureHeader.replace(/^sha256=/i, '').trim();

      if (hmac !== normalizedIncoming) {
        console.error(`[card][${requestId}] Signature verification failed`);
        return res.status(400).json({ 
          error: 'Invalid signature',
          requestId
        });
      }
      console.log(`[card][${requestId}] Signature verified successfully`);
    } else if (!signatureHeader) {
      console.warn(`[card][${requestId}] No signature provided - accepting in ${isProduction ? 'production' : 'development'} mode (verify=${shouldVerify})`);
    }

    // Process webhook event
    const event = typeof (req as any).rawBody === 'string' ? JSON.parse((req as any).rawBody) : req.body;
    
    if (!event) {
      console.error(`[card][${requestId}] No event data received`);
      return res.status(400).json({ 
        error: 'No event data',
        requestId
      });
    }

    console.log(`[card][${requestId}] Processing webhook event:`, {
      state: event?.state,
      invoice_id: event?.invoice_id,
      api_ref: event?.api_ref,
      provider: event?.provider,
      amount: event?.value
    });

    const provider = String(event?.provider || event?.channel || '').toLowerCase();
    let paymentMethod: 'card' | 'mpesa' | 'apple-pay' | 'google-pay' = 'card';
    if (provider.includes('mpesa')) paymentMethod = 'mpesa';
    else if (provider.includes('apple')) paymentMethod = 'apple-pay';
    else if (provider.includes('google')) paymentMethod = 'google-pay';

    const status = String(event?.state || event?.status || '').toLowerCase();
    const api_ref = event?.api_ref || event?.reference || event?.invoice?.api_ref;
    const invoice_id = event?.invoice_id || event?.invoice?.id;

    if (!api_ref) {
      console.warn(`[card][${requestId}] No api_ref found in webhook event`);
      return res.status(400).json({ 
        error: 'Missing api_ref in webhook data',
        requestId
      });
    }

    console.log(`[card][${requestId}] Looking for payment with api_ref: ${api_ref}`);
    
    const { data: payments, error: findErr } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('api_ref', api_ref)
      .limit(1);

    if (findErr) {
      console.error(`[card][${requestId}] Database error finding payment:`, findErr);
      return res.status(500).json({ 
        error: 'Database error',
        requestId
      });
    }

    if (!payments || payments.length === 0) {
      console.warn(`[card][${requestId}] Payment not found for api_ref=${api_ref}`);
      return res.status(404).json({ 
        error: 'Payment not found',
        api_ref,
        requestId
      });
    }

    const payment = payments[0];
    console.log(`[card][${requestId}] Found payment record: ${payment.id}, updating status to: ${status}`);
    
    // Update payment record
    const { error: updateErr } = await supabaseAdmin
      .from('payments')
      .update({ 
        status, 
        provider: event?.provider, 
        invoice_id, 
        tracking_id: event?.invoice_id,
        processor_response: event,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (updateErr) {
      console.error(`[card][${requestId}] Error updating payment:`, updateErr);
      return res.status(500).json({ 
        error: 'Failed to update payment',
        requestId
      });
    }

    // Update order status if order exists
    if (payment.order_id) {
      console.log(`[card][${requestId}] Updating order ${payment.order_id} status to: ${status}`);
      const { error: orderUpdateErr } = await supabaseAdmin
        .from('orders')
        .update({ 
          payment_status: status, 
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.order_id);

      if (orderUpdateErr) {
        console.error(`[card][${requestId}] Error updating order:`, orderUpdateErr);
        // Don't return error here, payment update was successful
      }
    }
    
    console.log(`[card][${requestId}] Successfully processed webhook for payment: ${payment.id}`);
    
    return res.status(200).json({ 
      success: true,
      message: 'Webhook processed successfully',
      payment_id: payment.id,
      status,
      requestId
    });

  } catch (err: any) {
    console.error(`[card][${requestId}] Webhook processing error:`, err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err.message,
      requestId
    });
  }
});

// Helper function to handle failed payment
async function handleFailedPayment(webhookId: string, invoice: any) {
  console.log(`[${webhookId}] Handling failed payment for invoice:`, invoice.id);
  try {
    // Update payment status in database
    await updatePaymentStatus(invoice.metadata?.payment_id || invoice.id, 'failed', {
      webhook_id: webhookId,
      failure_reason: invoice.failure_reason,
      raw_response: JSON.stringify(invoice)
    });
  } catch (error) {
    console.error(`[${webhookId}] Error updating failed payment:`, error);
    throw error;
  }
}

// Helper function to handle completed payment
async function handleCompletedPayment(webhookId: string, invoice: any) {
  console.log(`[${webhookId}] Handling completed payment for invoice:`, invoice.id);
  try {
    // Update payment status in database
    await updatePaymentStatus(invoice.metadata?.payment_id || invoice.id, 'completed', {
      webhook_id: webhookId,
      amount_settled: invoice.amount_settled,
      fees: invoice.fees,
      raw_response: JSON.stringify(invoice)
    });
  } catch (error) {
    console.error(`[${webhookId}] Error updating completed payment:`, error);
    throw error;
  }
}

// Helper function to handle refunded payment
async function handleRefundedPayment(webhookId: string, invoice: any) {
  console.log(`[${webhookId}] Handling refunded payment for invoice:`, invoice.id);
  try {
    // Update payment status in database
    await updatePaymentStatus(invoice.metadata?.payment_id || invoice.id, 'refunded', {
      webhook_id: webhookId,
      refund_amount: invoice.refund_amount,
      refund_reason: invoice.refund_reason,
      raw_response: JSON.stringify(invoice)
    });
  } catch (error) {
    console.error(`[${webhookId}] Error updating refunded payment:`, error);
    throw error;
  }
}

// Helper function to handle disputed payment
async function handleDisputedPayment(webhookId: string, invoice: any) {
  console.log(`[${webhookId}] Handling disputed payment for invoice:`, invoice.id);
  try {
    // Update payment status in database
    await updatePaymentStatus(invoice.metadata?.payment_id || invoice.id, 'disputed', {
      webhook_id: webhookId,
      dispute_reason: invoice.dispute_reason,
      dispute_status: invoice.dispute_status,
      raw_response: JSON.stringify(invoice)
    });
  } catch (error) {
    console.error(`[${webhookId}] Error updating disputed payment:`, error);
    throw error;
  }
}

// Helper function to handle payment updates
async function handlePaymentUpdate(webhookId: string, invoice: any, status: string, metadata: any) {
  console.log(`[${webhookId}] Handling ${status} payment for invoice ${invoice.id}`);
  
  const { payment_id, order_id } = invoice.metadata || {};
  if (!payment_id && !order_id) {
    console.error(`[${webhookId}] No payment_id or order_id in metadata`);
    return;
  }

  try {
    const { data: payment, error } = await supabase
      .from('payments')
      .update({
        status,
        metadata: {
          ...metadata,
          updated_at: new Date().toISOString()
        }
      })
      .or(`id.eq.${payment_id},order_id.eq.${order_id}`)
      .select()
      .single();

    if (error) throw error;

    console.log(`[${webhookId}] Updated payment status to ${status}:`, payment.id);

    // Update order status
    if (payment.order_id) {
      await supabase
        .from('orders')
        .update({ status })
        .eq('id', payment.order_id);
    }
  } catch (error) {
    console.error(`[${webhookId}] Error handling ${status} payment:`, error);
    throw error;
  }
}

// Endpoint to handle payment completion from frontend
cardRouter.post('/complete', [
  verifyToken,
  body('transaction_id').notEmpty().withMessage('Transaction ID is required'),
  body('status').isIn(['completed', 'failed', 'cancelled']).withMessage('Invalid status'),
  body('transaction_data').optional().isObject(),
  validateRequest
], async (req: ExpressRequest, res: Response) => {
  const requestId = `complete_${Date.now()}`;
  const { transaction_id, api_ref, status, transaction_data } = req.body;
  
  console.log(`[${requestId}] Payment completion callback:`, {
    transaction_id,
    api_ref,
    status,
    user_id: req.user?.id,
    has_transaction_data: !!transaction_data
  });
  
  try {
    // For now, just log the completion since we don't have a payment record yet
    // The order creation happens in the frontend
    console.log(`[${requestId}] Payment completed successfully:`, {
      transaction_id,
      api_ref,
      status,
      amount: transaction_data?.value,
      provider: transaction_data?.provider
    });
    
    return res.json({
      success: true,
      message: `Payment ${status} successfully`,
      transaction_id,
      api_ref,
      requestId
    });
    
  } catch (error) {
    console.error(`[${requestId}] Error processing payment completion:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process payment completion',
      requestId
    });
  }
});

// Log all registered card routes
const logCardRoutes = () => {
  try {
    console.log('\n=== CARD PAYMENT ROUTES ===');
    cardRouter.stack.forEach((layer: any) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods || {}).join(',').toUpperCase();
        console.log(`  ${methods.padEnd(7)} /api/payment/card${layer.route.path}`);
      }
    });
    console.log('==========================\n');
  } catch (error) {
    console.error('Error logging CARD routes:', error);
  }
};

// Add request logging middleware
cardRouter.use((req: ExpressRequest, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log('Headers:', {
    'content-type': req.headers['content-type'],
    'authorization': req.headers['authorization'] ? '***' : 'none',
    'user-agent': req.headers['user-agent']
  });
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// Log routes after they're all registered
setImmediate(() => {
  console.log('\n=== CARD ROUTES ===');
  console.log('  POST   /api/payment/card');
  console.log('  POST   /api/payment/card/webhook');
  console.log('  POST   /api/payment/card/complete');
  console.log('===================\n');
});
