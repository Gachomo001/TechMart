import * as express from 'express';
import { Router } from 'express';
import IntaSend from 'intasend-node';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';
import { Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: join(__dirname, '../../.env') });

export const mpesaRouter = Router();

const publishableKey = process.env.VITE_INTASEND_PUBLISHABLE_KEY || '';
const secretKey = process.env.INTASEND_SECRET_KEY || '';
const isProduction = process.env.NODE_ENV === 'production';

const intasend = new IntaSend(
  publishableKey,
  secretKey,
  isProduction ? 'live' : 'sandbox'
);

const collection = intasend.collection();

// Debug logging
console.log('MPESA ROUTES LOADED');

// Test route for debugging
mpesaRouter.get('/test', (req, res) => {
  console.log('Test route hit');
  res.json({ success: true, message: 'Test route works' });
});

// Log all registered routes
const logRoutes = () => {
  try {
    console.log('\n=== MPESA ROUTES ===');
    mpesaRouter.stack.forEach((layer: any) => {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods || {}).join(',').toUpperCase();
        console.log(`  ${methods.padEnd(7)} /api/payment/mpesa${layer.route.path}`);
      }
    });
    console.log('======================================\n');
  } catch (error) {
    console.error('Error logging MPESA routes:', error);
  }
};

// Log routes after they're all registered
setImmediate(logRoutes);

// Add express.json() middleware to parse JSON bodies
mpesaRouter.use(express.json());

// Store payment status in memory (in production, use a database)
interface PaymentStatus {
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'PROCESSING' | 'UNKNOWN';
  transactionId: string;
  invoiceId: string;
  error?: string;
  failed_reason?: string;
  order_details?: any;
  created_at: number;
  updated_at?: number;
  amount: number;
  orderId: string;
  // Additional fields from webhook updates
  invoice_id?: any;
  provider?: any;
  mpesa_reference?: any;
  webhook_data?: any;
}

const paymentStatusMap = new Map<string, PaymentStatus>();

// Handle M-Pesa payment request
mpesaRouter.post('/', async (req: Request, res: Response) => {
  console.log('M-Pesa charge request received. Headers:', req.headers);
  
  try {
    // Log the raw body
    const rawBody = req.body as {
      phoneNumber: string;
      amount: string | number;
      order_details?: any;
      orderId?: string;
    };
    
    console.log('Request body type:', typeof rawBody);
    console.log('Request body:', rawBody);
    
    // Ensure we have a valid request body
    if (!rawBody) {
      console.error('No request body received');
      return res.status(400).json({ 
        success: false,
        error: 'No request body received' 
      });
    }
    
    // Extract required fields from request body
    const { phoneNumber, order_details } = rawBody;
    const orderId = rawBody.orderId || `order_${Date.now()}`;
    
    // Parse and validate amount
    let paymentAmount = 0;
    if (typeof rawBody.amount === 'string') {
      paymentAmount = parseFloat(rawBody.amount);
    } else if (typeof rawBody.amount === 'number') {
      paymentAmount = rawBody.amount;
    } else {
      throw new Error('Invalid amount format');
    }
    
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      throw new Error('Invalid amount');
    }
    
    // Initialize payment status
    const transactionId = `txn_${Date.now()}`;
    const paymentStatus: PaymentStatus = {
      status: 'PENDING',
      orderId,
      order_details,
      amount: paymentAmount,
      created_at: Date.now(),
      transactionId,
      invoiceId: `inv_${Date.now()}`
    };
    
    paymentStatusMap.set(orderId, paymentStatus);

    // Format phone number (remove + and any spaces)
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }
    const formattedPhone = phoneNumber.replace(/\D/g, '');
    
    // Validate required parameters
    const missingParams: string[] = [];
    if (!phoneNumber) missingParams.push('phoneNumber');
    if (isNaN(paymentAmount) || paymentAmount <= 0) missingParams.push('amount');
    
    if (missingParams.length > 0) {
      console.error('Missing required parameters:', missingParams);
      return res.status(400).json({ 
        success: false,
        error: `Missing required parameters: ${missingParams.join(', ')}`,
        missing: missingParams
      });
    }
    
    try {
      // Create M-Pesa payment request
      const response = await collection.mpesaStkPush({
        currency: 'KES',
        method: 'M-PESA',
        phone_number: formattedPhone,
        email: 'customer@example.com',
        amount: paymentStatus.amount,
        api_ref: orderId,
        mode: 'STK_PUSH',
        metadata: {
          orderId,
          customerPhone: formattedPhone
        }
      });

      console.log('M-Pesa payment initiated:', response);

      // Update the transaction ID if available in the response
      if (response?.invoice?.invoice_id) {
        paymentStatus.transactionId = response.invoice.invoice_id;
        paymentStatus.invoiceId = response.invoice.invoice_id;
        paymentStatusMap.set(orderId, paymentStatus);
      }

      
      // Return the response to the client with both orderId and transactionId
      return res.status(200).json({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          orderId: paymentStatus.orderId,
          transactionId: paymentStatus.transactionId,
          invoiceId: paymentStatus.invoiceId,
          status: 'PENDING',
          amount: paymentStatus.amount,
          phoneNumber: formattedPhone
        }
      });
    } catch (error: any) {
      console.error('M-Pesa payment error:', error);
      
      // Update payment status to failed
      if (paymentStatusMap.has(orderId)) {
        paymentStatusMap.set(orderId, {
          ...paymentStatusMap.get(orderId)!,
          status: 'FAILED',
          error: error.message || 'Payment processing failed'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to initiate M-Pesa payment'
      });
    }
  } catch (error: any) {
    console.error('M-Pesa payment error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to initiate M-Pesa payment' 
    });
  }
});

// Helper function to find order ID by invoice ID
const findOrderIdByInvoiceId = (invoiceId: string): string | undefined => {
  for (const [orderId, status] of paymentStatusMap.entries()) {
    if (status.invoiceId === invoiceId) {
      return orderId;
    }
  }
  return undefined;
};

// Helper function to find payment by transaction ID
const findPaymentByTransactionId = (transactionId: string): { orderId: string, status: PaymentStatus } | null => {
  for (const [orderId, status] of paymentStatusMap.entries()) {
    if (status.transactionId === transactionId) {
      return { orderId, status };
    }
  }
  return null;
};

// Endpoint to check payment status by transaction ID, order ID, or invoice ID
mpesaRouter.get('/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Checking status for ID: ${id}`);
    
    // First, try to find by transaction ID (most specific)
    const transactionMatch = findPaymentByTransactionId(id);
    if (transactionMatch) {
      console.log(`Found payment by transaction ID: ${id}`);
      const { orderId, status } = transactionMatch;
      return res.status(200).json({
        success: status.status === 'COMPLETED',
        data: {
          status: status.status,
          orderId,
          transactionId: status.transactionId,
          invoiceId: status.invoiceId,
          error: status.error || status.failed_reason,
          failed_reason: status.failed_reason,
          amount: status.amount,
          timestamp: status.updated_at || status.created_at
        }
      });
    }
    
    // If not found by transaction ID, try by order ID
    let orderId = id;
    let paymentStatus = paymentStatusMap.get(id);
    
    // If not found by order ID, try to find by invoice ID
    if (!paymentStatus) {
      console.log(`No direct match for order ID ${id}, searching by invoice ID`);
      const foundOrderId = findOrderIdByInvoiceId(id);
      if (foundOrderId) {
        orderId = foundOrderId;
        paymentStatus = paymentStatusMap.get(orderId);
      }
    }

    // If we found a payment status, return it
    if (paymentStatus) {
      console.log(`Returning status for ${orderId}:`, paymentStatus);
      
      // Get the most specific error message available
      const errorMessage = paymentStatus.error || paymentStatus.failed_reason || null;
      
      // Prepare response data with all relevant fields
      const responseData: any = {
        status: paymentStatus.status,
        orderId,
        transactionId: paymentStatus.transactionId,
        invoiceId: paymentStatus.invoiceId,
        amount: paymentStatus.amount,
        timestamp: paymentStatus.updated_at || paymentStatus.created_at
      };

      // Only include error fields if there's an error
      if (errorMessage) {
        responseData.error = errorMessage;
        responseData.failed_reason = errorMessage;
      }
      
      return res.status(200).json({
        success: paymentStatus.status === 'COMPLETED',
        data: responseData
      });
    }
    
    // If still not found, check with IntaSend directly (treating ID as invoice ID)
    console.log(`No local record found for ${id}, checking with IntaSend`);
    try {
      const invoice = await collection.status(id);
      console.log('IntaSend status response:', invoice);
      
      if (invoice) {
        const status = invoice.state === 'COMPLETE' ? 'COMPLETED' : 
                      invoice.state === 'FAILED' ? 'FAILED' : 'PENDING';
        
        // Create a new status entry if we have an order ID
        if (invoice.api_ref) {
          const statusUpdate: PaymentStatus = {
            status,
            transactionId: id,
            invoiceId: invoice.invoice_id,
            orderId: invoice.api_ref,
            created_at: Date.now(),
            updated_at: Date.now(),
            amount: invoice.value ? parseFloat(invoice.value) : 0
          };
          
          if (status === 'FAILED') {
            statusUpdate.error = invoice.failed_reason || 'Payment failed';
            statusUpdate.failed_reason = invoice.failed_reason;
          }
          
          paymentStatusMap.set(invoice.api_ref, statusUpdate);
          paymentStatus = statusUpdate;
          orderId = invoice.api_ref;
          
          console.log(`Updated payment status from IntaSend:`, statusUpdate);
        }
      }
    } catch (error) {
      console.error('Error checking payment status with IntaSend:', error);
    }

    // If we still don't have a payment status, return not found
    if (!paymentStatus) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found',
        data: {
          status: 'NOT_FOUND',
          id,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Prepare the response data
    const responseData = {
      status: paymentStatus.status,
      orderId,
      transactionId: paymentStatus.transactionId,
      invoiceId: paymentStatus.invoiceId,
      error: paymentStatus.error || paymentStatus.failed_reason,
      failed_reason: paymentStatus.failed_reason,
      amount: paymentStatus.amount,
      timestamp: paymentStatus.updated_at || paymentStatus.created_at
    };

    return res.json({
      success: paymentStatus.status === 'COMPLETED',
      data: responseData
    });
  } catch (error: any) {
    console.error('Error in payment status check:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error checking payment status'
    });
  }
});

// Webhook endpoint for IntaSend payment callbacks
mpesaRouter.post('/webhook', express.json(), async (req, res) => {
  const webhookId = `mpesa_wh_${Date.now()}`;
  try {
    console.log(`[mpesa][${webhookId}] Received webhook:`, JSON.stringify(req.body, null, 2));
    
    const { 
      invoice_id, 
      state, 
      provider,
      api_ref,
      orderId, // Legacy field
      value,
      account,
      mpesa_reference
    } = req.body;

    // Check if this is actually a card payment sent to wrong endpoint
    const providerStr = String(provider || '').toLowerCase();
    if (providerStr.includes('card')) {
      console.warn(`[mpesa][${webhookId}] Card payment webhook received at M-Pesa endpoint - this should go to /api/payment/card/webhook`);
      console.warn(`[mpesa][${webhookId}] Provider: ${provider}, API Ref: ${api_ref}`);
      // Still process it but log the routing issue
    }

    // Use api_ref first, fallback to legacy orderId
    const paymentRef = api_ref || orderId;
    
    if (!paymentRef) {
      console.error(`[mpesa][${webhookId}] No api_ref or orderId in webhook payload`);
      return res.status(400).json({ 
        error: 'Missing payment reference',
        webhookId
      });
    }

    console.log(`[mpesa][${webhookId}] Processing payment reference: ${paymentRef}`);

    // Update payment status based on webhook
    const currentStatus = paymentStatusMap.get(paymentRef);
    if (currentStatus) {
      const status: PaymentStatus['status'] = state === 'COMPLETE' ? 'COMPLETED' : 
                   state === 'FAILED' ? 'FAILED' :
                   state === 'PENDING' ? 'PENDING' :
                   state === 'PROCESSING' ? 'PROCESSING' : 'UNKNOWN';
      
      const statusUpdate: PaymentStatus = {
        ...currentStatus,
        status,
        invoice_id,
        provider,
        mpesa_reference,
        updated_at: Date.now(),
        webhook_data: req.body
      };
      
      paymentStatusMap.set(paymentRef, statusUpdate);
      console.log(`[mpesa][${webhookId}] Updated payment status for ${paymentRef}:`, statusUpdate);
    } else {
      console.warn(`[mpesa][${webhookId}] Received webhook for unknown payment reference: ${paymentRef}`);
      console.warn(`[mpesa][${webhookId}] This might be a card payment routed to M-Pesa webhook by mistake`);
    }

    return res.status(200).json({ 
      success: true,
      received: true,
      webhookId,
      payment_ref: paymentRef
    });
  } catch (error: any) {
    console.error(`[mpesa][${webhookId}] Error processing webhook:`, error);
    return res.status(500).json({ 
      error: 'Error processing webhook',
      message: error.message,
      webhookId
    });
  }
});
