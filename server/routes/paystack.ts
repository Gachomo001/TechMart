import { Router, json, type Request as ExpressRequest, type Response, NextFunction } from 'express';
import { supabase as supabaseClient, supabaseAdmin } from '../lib/supabase.js';
import type { User } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import rateLimit from 'express-rate-limit';
import { body, validationResult, check } from 'express-validator';
import helmet from 'helmet';
import csrf from 'csurf';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Then use require as normal
const Paystack = require('paystack');

// Extend the Express Request type to include user and csrfToken
declare global {
  namespace Express {
    interface Request {
      user?: User;
      csrfToken: () => string;
    }
  }
}

console.log('PAYSTACK ROUTES LOADED');

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFilePath);

// Load environment variables from root .env file
dotenv.config({ path: join(currentDir, '../../.env') });

export const paystackRouter = Router();

// Initialize PayStack with environment variables
const publicKey = process.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY;
const secretKey = process.env.PAYSTACK_SECRET_KEY;
const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
const isProduction = process.env.NODE_ENV === 'production';

// Validate required environment variables
const requiredEnvVars = [
  'PAYSTACK_SECRET_KEY',
  'PAYSTACK_WEBHOOK_SECRET',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
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
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 3600, // 1 hour
    path: '/'
  },
  value: (req) => {
    const headerToken = req.headers['x-csrf-token'] || 
                      req.headers['x-xsrf-token'] ||
                      req.headers['xsrf-token'] ||
                      req.headers['x-csrftoken'] ||
                      req.headers['x-csrf'];
    
    const bodyToken = req.body && (req.body._csrf || req.body.csrfToken);
    const queryToken = req.query && (req.query._csrf || req.query.csrfToken);
    
    return headerToken || bodyToken || queryToken;
  }
});

// Initialize PayStack client
if (!secretKey) {
  throw new Error('Missing required PayStack secret key');
}

const paystack = new Paystack(secretKey);

// Helper function to map PayStack channel to our payment method
function getPaymentMethod(channel: string): string {
  switch (channel?.toLowerCase()) {
    case 'mobile_money':
      return 'mobile_money'; // Unified for all mobile money providers
    case 'bank':
      return 'bank_transfer';
    case 'ussd':
      return 'ussd';
    case 'card':
    default:
      return 'card';
  }
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
      payment_method: 'paystack',
      api_ref: metadata.reference || metadata.api_ref,
      metadata: {
        ...metadata,
        processed_at: new Date().toISOString()
      }
    };

    if (userId) {
      paymentData.user_id = userId;
    }

    console.log('Creating payment record with data:', JSON.stringify(paymentData, null, 2));

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

// Helper to verify PayStack webhook signature
function verifyPayStackSignature(signature: string, payload: string, secret: string): boolean {
  try {
    const hash = crypto.createHmac('sha512', secret).update(payload).digest('hex');
    return hash === signature;
  } catch (error) {
    console.error('Error verifying PayStack signature:', error);
    return false;
  }
}

// Middleware to verify JWT and get user
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
  
  if (!token || token.length < 30) {
    return res.status(401).json({ 
      success: false,
      error: 'Invalid token format',
      code: 'INVALID_TOKEN_FORMAT'
    });
  }

  try {
    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ 
        success: false,
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }
    
    if (user.confirmed_at === null) {
      return res.status(403).json({
        success: false,
        error: 'Email not verified',
        code: 'EMAIL_NOT_VERIFIED'
      });
    }
    
    const { data: profile, error: profileError } = await supabaseClient
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

// Apply CSRF protection to routes except webhooks
paystackRouter.use((req: ExpressRequest, res: Response, next: NextFunction) => {
  if (req.path === '/webhook' || req.path === '/complete') {
    return next();
  }
  csrfProtection(req, res, next);
});

// CSRF Token Endpoint
paystackRouter.get('/csrf-token', (req: ExpressRequest, res: Response) => {
  const token = req.csrfToken();
  console.log('CSRF token requested. Generated token:', token);
  res.json({ 
    success: true,
    csrfToken: token,
    timestamp: new Date().toISOString()
  });
});

// Apply security middleware
paystackRouter.use(helmet());
paystackRouter.use(apiLimiter);

// Helper to generate unique order number
async function generateUniqueOrderNumber(): Promise<string> {
  const ts = new Date();
  const y = ts.getFullYear();
  const m = String(ts.getMonth() + 1).padStart(2, '0');
  const d = String(ts.getDate()).padStart(2, '0');

  for (let attempt = 0; attempt < 5; attempt++) {
    const seq = Math.floor(Math.random() * 900000 + 100000);
    const order_number = `Order-${y}${m}${d}-${seq}`;

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

  const fallbackSeq = String(Date.now()).slice(-6);
  return `Order-${y}${m}${d}-${fallbackSeq}`;
}

// Initialize order before opening PayStack popup
paystackRouter.post('/order/init', verifyToken, csrfProtection, apiLimiter, async (req: ExpressRequest, res: Response) => {
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

    const order_number = await generateUniqueOrderNumber();
    const notes = shipping_info.notes || null;
    const cleanShippingInfo = { ...shipping_info };
    delete cleanShippingInfo.notes;

    const insertPayload: any = {
      user_id: userId,
      status: 'pending',
      payment_status: 'pending',
      payment_method: 'paystack',
      total_amount: amount,
      shipping_cost,
      shipping_type,
      shipping_info: cleanShippingInfo,
      notes,
      subtotal,
      tax_amount,
      order_number,
    };

    console.log(`[paystack][${requestId}] Creating order with:`, JSON.stringify(insertPayload));

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert([insertPayload])
      .select()
      .single();

    if (error) {
      console.error(`[paystack][${requestId}] order insert error:`, error);
      return res.status(500).json({ error: 'Failed to create order', details: error.message, requestId });
    }
    // After creating the order successfully
    if (data) {
      // Create corresponding payment record
      const paymentRecord = await createPaymentRecord(
        data.id, // order_id
        amount, // amount
        'KES', // currency
        { 
          order_number: data.order_number,
          user_id: userId 
        }, // metadata
        userId // user_id
      );
      
      console.log(`[${requestId}] Created payment record:`, paymentRecord.id);
    }

    return res.json({ data, requestId });
  } catch (err: any) {
    console.error('[paystack][order.init] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err?.message });
  }
});

// Initialize PayStack payment
paystackRouter.post('/', verifyToken, csrfProtection, apiLimiter, async (req: ExpressRequest, res: Response) => {
  const requestId = `paystack_init_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', requestId });
    }

    const { amount, currency = 'KES', email, reference, callback_url, metadata } = req.body || {};

    if (!amount || !email) {
      return res.status(400).json({ error: 'amount and email are required', requestId });
    }

    // Initialize PayStack transaction
    const paystackData = {
      amount: Math.round(amount * 100), // PayStack expects amount in kobo/cents
      currency,
      email,
      reference: reference || `ps_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      callback_url: callback_url || `${req.protocol}://${req.get('host')}/checkout/complete`,
      metadata: {
        ...metadata,
        user_id: userId,
        custom_fields: [
          {
            display_name: "User ID",
            variable_name: "user_id",
            value: userId
          }
        ]
      }
    };

    console.log(`[paystack][${requestId}] Initializing transaction:`, paystackData);

    const response = await paystack.transaction.initialize(paystackData);

    if (!response.status) {
      throw new Error(response.message || 'PayStack initialization failed');
    }

    console.log(`[paystack][${requestId}] Transaction initialized:`, response.data);

    return res.json({ 
      success: true,
      data: response.data,
      requestId 
    });
  } catch (error: any) {
    console.error(`[paystack][init][${requestId}] Error:`, error);
    return res.status(500).json({ error: error.message || 'Failed to initialize payment', requestId });
  }
});

// Verify PayStack transaction
paystackRouter.get('/verify/:reference', verifyToken, async (req: ExpressRequest, res: Response) => {
  const { reference } = req.params;
  const requestId = `verify_${Date.now()}`;
  
  console.log(`[${requestId}] Verifying PayStack transaction:`, reference);
  
  try {
    const response = await paystack.transaction.verify(reference);

    if (!response.status) {
      throw new Error(response.message || 'Transaction verification failed');
    }

    console.log(`[${requestId}] Transaction verification result:`, response.data);

    return res.status(200).json({ 
      success: true, 
      data: response.data 
    });

  } catch (error: any) {
    console.error(`[${requestId}] Error verifying transaction:`, error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Transaction verification failed' 
    });
  }
});

// PayStack webhook endpoint
paystackRouter.post('/webhook', apiLimiter, async (req: ExpressRequest & { rawBody?: string }, res: Response) => {
  const requestId = `wh_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  
  try {
    const signature = req.headers['x-paystack-signature'] as string;
    const rawBody = (req as any).rawBody || JSON.stringify(req.body);
    
    console.log(`[paystack][${requestId}] Webhook request received`);
    
    // Verify webhook signature
    if (webhookSecret && signature) {
      const isValid = verifyPayStackSignature(signature, rawBody, webhookSecret);
      if (!isValid) {
        console.error(`[paystack][${requestId}] Invalid webhook signature`);
        return res.status(400).json({ 
          error: 'Invalid signature',
          requestId
        });
      }
      console.log(`[paystack][${requestId}] Signature verified successfully`);
    } else {
      console.warn(`[paystack][${requestId}] No signature verification (dev mode)`);
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : req.body;
    
    if (!event || !event.event) {
      console.error(`[paystack][${requestId}] No event data received`);
      return res.status(400).json({ 
        error: 'No event data',
        requestId
      });
    }

    console.log(`[paystack][${requestId}] Processing webhook event:`, {
      event: event.event,
      reference: event.data?.reference,
      status: event.data?.status,
      amount: event.data?.amount
    });

    const { event: eventType, data } = event;
    
    // Handle different PayStack events
    switch (eventType) {
      case 'charge.success':
        await handleSuccessfulPayment(requestId, data);
        break;
      case 'charge.failed':
        await handleFailedPayment(requestId, data);
        break;
      default:
        console.log(`[paystack][${requestId}] Unhandled event type: ${eventType}`);
    }
    
    console.log(`[paystack][${requestId}] Successfully processed webhook`);
    
    return res.status(200).json({ 
      success: true,
      message: 'Webhook processed successfully',
      requestId
    });

  } catch (err: any) {
    console.error(`[paystack][${requestId}] Webhook processing error:`, err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err.message,
      requestId
    });
  }
});

// Helper function to handle successful payment
async function handleSuccessfulPayment(webhookId: string, data: any) {
  console.log(`[${webhookId}] Handling successful payment:`, data.reference);
  
  try {
    const { reference, amount, currency, customer, channel, metadata } = data;
    // Debug the channel field specifically
    console.log(`[${webhookId}] PayStack webhook data:`, {
      reference,
      channel,
      channelType: typeof channel,
      amount,
      customer: customer?.email
    });
    // Find payment record by reference
    const { data: payments, error: findErr } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('api_ref', reference)
      .limit(1);

    if (findErr) {
      console.error(`[${webhookId}] Database error finding payment:`, findErr);
      return;
    }

    if (!payments || payments.length === 0) {
      console.warn(`[${webhookId}] Payment not found for reference=${reference}`);
      return;
    }

    const payment = payments[0];
    
    // Update payment status
    const { error: updateErr } = await supabaseAdmin
      .from('payments')
      .update({ 
        status: 'completed',
        provider: 'paystack',
        tracking_id: reference,
        processor_response: data,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (updateErr) {
      console.error(`[${webhookId}] Error updating payment:`, updateErr);
      return;
    }

    console.log(`[${webhookId}] Payment method mapping:`, {
      originalChannel: channel,
      mappedPaymentMethod: getPaymentMethod(channel)
    });

    // Update order status if order exists
    if (payment.order_id) {
      console.log(`[${webhookId}] Updating order ${payment.order_id} status`);

// Determine payment method from PayStack channel
const paymentMethod = getPaymentMethod(channel);
      
      const { error: orderUpdateErr } = await supabaseAdmin
        .from('orders')
        .update({ 
          payment_status: 'completed',
          payment_method: paymentMethod,
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.order_id);

      if (orderUpdateErr) {
        console.error(`[${webhookId}] Error updating order:`, orderUpdateErr);
      }
    }
    
    console.log(`[${webhookId}] Successfully processed successful payment`);
  } catch (error) {
    console.error(`[${webhookId}] Error handling successful payment:`, error);
  }
}

// Helper function to handle failed payment
async function handleFailedPayment(webhookId: string, data: any) {
  console.log(`[${webhookId}] Handling failed payment:`, data.reference);
  
  try {
    const { reference } = data;
    
    // Find payment record by reference
    const { data: payments, error: findErr } = await supabaseAdmin
      .from('payments')
      .select('*')
      .eq('api_ref', reference)
      .limit(1);

    if (findErr || !payments || payments.length === 0) {
      console.warn(`[${webhookId}] Payment not found for reference=${reference}`);
      return;
    }

    const payment = payments[0];
    
    // Update payment status
    const { error: updateErr } = await supabaseAdmin
      .from('payments')
      .update({ 
        status: 'failed',
        provider: 'paystack',
        processor_response: data,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.id);

    if (updateErr) {
      console.error(`[${webhookId}] Error updating failed payment:`, updateErr);
      return;
    }

    // Update order status if order exists
    if (payment.order_id) {
      const { error: orderUpdateErr } = await supabaseAdmin
        .from('orders')
        .update({ 
          payment_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', payment.order_id);

      if (orderUpdateErr) {
        console.error(`[${webhookId}] Error updating order:`, orderUpdateErr);
      }
    }
    
    console.log(`[${webhookId}] Successfully processed failed payment`);
  } catch (error) {
    console.error(`[${webhookId}] Error handling failed payment:`, error);
  }
}

// Payment completion endpoint from frontend
paystackRouter.post('/complete', [
  verifyToken,
  body('reference').notEmpty().withMessage('Reference is required'),
  body('status').isIn(['success', 'failed', 'cancelled']).withMessage('Invalid status'),
  validateRequest
], async (req: ExpressRequest, res: Response) => {
  const requestId = `complete_${Date.now()}`;
  const { reference, status } = req.body;
  
  console.log(`[${requestId}] Payment completion callback:`, {
    reference,
    status,
    user_id: req.user?.id
  });
  
  try {
    // Verify the transaction with PayStack
    const response = await paystack.transaction.verify(reference);
    
    if (response.status && response.data.status === 'success') {
      console.log(`[${requestId}] Payment completed successfully:`, {
        reference,
        amount: response.data.amount,
        channel: response.data.channel
      });
    }
    
    return res.json({
      success: true,
      message: `Payment ${status} successfully`,
      reference,
      requestId
    });
    
  } catch (error: any) {
    console.error(`[${requestId}] Error processing payment completion:`, error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process payment completion',
      requestId
    });
  }
});

// Log routes
setImmediate(() => {
  console.log('\n=== PAYSTACK ROUTES ===');
  console.log('  POST   /api/payment/paystack');
  console.log('  POST   /api/payment/paystack/webhook');
  console.log('  POST   /api/payment/paystack/complete');
  console.log('  GET    /api/payment/paystack/verify/:reference');
  console.log('=======================\n');
});
