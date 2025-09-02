export interface PaymentResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
  status?: string;
}

// Base URL for API requests
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

// Payment status enum
export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED'
}

export interface MpesaPaymentRequest {
  phone: string;
  amount: number;
  account_reference: string;
}

export const initiateMpesaPayment = async (
  phoneNumber: string, 
  amount: number, 
  orderId: string
): Promise<PaymentResponse> => {
  try {
    console.log('Initiating M-Pesa payment:', { phoneNumber, amount, orderId });
    
    const response = await fetch(`${API_BASE_URL}/api/payment/mpesa/stk-push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: phoneNumber,
        amount: amount,
        account_reference: orderId
      } as MpesaPaymentRequest)
    });

    const responseData = await response.json();
    console.log('M-Pesa API response:', responseData);
    
    if (!response.ok) {
      const errorMessage = responseData.message || responseData.error || 'Failed to initiate M-Pesa payment';
      throw new Error(errorMessage);
    }

    return { 
      success: true,
      status: 'PENDING',
      message: 'M-Pesa payment initiated. Please check your phone to complete the payment.',
      data: responseData
    };
  } catch (error: any) {
    console.error('M-Pesa payment error:', error);
    return { 
      success: false, 
      status: 'FAILED',
      error: error.message || 'Failed to initiate M-Pesa payment',
      message: error.message || 'Failed to initiate M-Pesa payment'
    };
  }
};

// Card payment interfaces
export interface CardDetails {
  number: string;
  expiry_month: string;
  expiry_year: string;
  cvv: string;
  name: string;
  card_type?: string;
}

export interface CardPaymentRequest {
  amount: number;
  email: string;
  phone_number: string;
  card: {
    number: string;
    expiry_month: string;
    expiry_year: string;
    cvv: string;
    card_type: string;
  };
  order_id?: string;
}

export const initiateCardPayment = async (
  cardDetails: CardDetails, 
  amount: number, 
  email: string,
  phoneNumber: string,
  orderId?: string
): Promise<PaymentResponse> => {
  try {
    console.log('Initiating card payment with order ID:', orderId);
    
    // Parse expiry month and year from MM/YY format if needed
    let expiryMonth = cardDetails.expiry_month;
    let expiryYear = cardDetails.expiry_year;
    
    // If expiry is in MM/YY format
    if (cardDetails.expiry_month.includes('/')) {
      const [month, year] = cardDetails.expiry_month.split('/');
      expiryMonth = month.trim();
      expiryYear = year.trim();
      // Convert 2-digit year to 4-digit
      if (expiryYear.length === 2) {
        expiryYear = `20${expiryYear}`;
      }
    }
    
    const requestBody: CardPaymentRequest = {
      amount: Math.round(amount * 100), // Convert to cents
      email: email,
      phone_number: phoneNumber,
      card: {
        number: cardDetails.number.replace(/\s+/g, ''),
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        cvv: cardDetails.cvv,
        card_type: cardDetails.card_type || 'visa' // Default to visa if not specified
      },
      order_id: orderId
    };

    console.log('Sending card payment request:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`${API_BASE_URL}/api/payment/card`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    const responseData = await response.json();
    console.log('Card payment API response:', responseData);
    
    if (!response.ok) {
      const errorMessage = responseData.message || responseData.error || 'Failed to process card payment';
      throw new Error(errorMessage);
    }

    return { 
      success: true,
      status: 'COMPLETE',
      message: 'Card payment processed successfully',
      data: {
        ...responseData,
        redirect_url: responseData.redirect_url || `${window.location.origin}/checkout/complete`
      }
    };
  } catch (error: any) {
    console.error('Card payment error:', error);
    return { 
      success: false,
      status: 'FAILED',
      error: error.message || 'Failed to process card payment',
      message: error.message || 'Failed to process card payment'
    };
  }
};

export const checkPaymentStatus = async (invoiceId: string): Promise<PaymentResponse> => {
  try {
    console.log('Checking payment status for invoice:', invoiceId);
    
    const response = await fetch(`${API_BASE_URL}/api/payment/status/${invoiceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.json();
    console.log('Payment status response:', responseData);
    
    if (!response.ok) {
      const errorMessage = responseData.message || responseData.error || 'Failed to check payment status';
      throw new Error(errorMessage);
    }

    // Handle different response formats
    const data = responseData.data || responseData;
    const status = data.status || data.state || 'PENDING';
    
    return {
      success: true,
      status: status.toUpperCase(),
      message: data.message || 'Payment status retrieved',
      data: {
        ...data,
        state: status,
        isComplete: ['COMPLETE', 'SUCCESS', 'PAID'].includes(status.toUpperCase()),
        isFailed: ['FAILED', 'ERROR', 'DECLINED', 'CANCELLED'].includes(status.toUpperCase()),
        isPending: ['PENDING', 'PROCESSING'].includes(status.toUpperCase())
      }
    };
  } catch (error: any) {
    console.error('Error checking payment status:', error);
    return {
      success: false,
      status: 'ERROR',
      error: error.message || 'Failed to check payment status',
      message: error.message || 'Failed to check payment status'
    };
  }
};