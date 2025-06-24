import axios from 'axios';
import { getPesapalConfig } from './config';

// Get current configuration
const config = getPesapalConfig();

// Check if we're in development mode
// To test real M-Pesa prompts, temporarily change this to: const isDevelopment = false;
const isDevelopment = false;

export interface PesapalPaymentRequest {
  amount: number;
  phoneNumber: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description?: string;
}

export interface PesapalCardPaymentRequest {
  amount: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description?: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardHolderName: string;
}

export interface PesapalPaymentResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  checkoutUrl?: string;
  status?: string;
  error?: string;
}

export interface PesapalStatusResponse {
  success: boolean;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  message: string;
  transactionId?: string;
  amount?: number;
  paymentMethod?: string;
  error?: string;
}

class PesapalService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  // Get authentication token
  private async getAccessToken(): Promise<string> {
    // Check if we have a valid token
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken!;
    }

    if (isDevelopment) {
      // Development mode - simulated authentication
      console.warn('Using development mode - authentication is simulated');
      this.accessToken = 'dev_token_' + Date.now();
      this.tokenExpiry = Date.now() + (55 * 60 * 1000);
      return this.accessToken;
    } else {
      // Production mode - use backend proxy
      try {
        const response = await axios.post('/functions/v1/pesapal-proxy', {
          action: 'auth',
          data: {}
        });

        if (response.data && response.data.token) {
          this.accessToken = response.data.token;
          this.tokenExpiry = Date.now() + (55 * 60 * 1000);
          return this.accessToken!;
        } else {
          throw new Error('Failed to get access token from proxy');
        }
      } catch (error: any) {
        console.error('Error getting Pesapal access token:', error);
        throw new Error('Authentication failed: ' + (error.response?.data?.error || error.message));
      }
    }
  }

  // Initiate M-Pesa payment
  async initiateMpesaPayment(paymentData: PesapalPaymentRequest): Promise<PesapalPaymentResponse> {
    try {
      const token = await this.getAccessToken();

      if (isDevelopment) {
        // Development mode - simulated payment
        console.log('Development mode: Simulating M-Pesa payment initiation', paymentData);
        
        return {
          success: true,
          message: 'Payment initiated successfully (Development Mode)',
          checkoutUrl: `${window.location.origin}/payment/callback?pesapal_transaction_tracking_id=dev_${Date.now()}&order_number=${paymentData.orderNumber}`,
          transactionId: `dev_${Date.now()}`
        };
      } else {
        // Production mode - use backend proxy
        const payload = {
          id: paymentData.orderNumber,
          currency: 'KES',
          amount: paymentData.amount,
          description: paymentData.description || 'Payment for TechMart order',
          callback_url: `${window.location.origin}/payment/callback`,
          notification_id: 'your_notification_id',
          billing_address: {
            email_address: paymentData.customerEmail,
            phone_number: paymentData.customerPhone,
            country_code: 'KE',
            first_name: paymentData.customerName.split(' ')[0] || '',
            last_name: paymentData.customerName.split(' ').slice(1).join(' ') || '',
            line_1: 'N/A',
            line_2: 'N/A',
            city: 'N/A',
            state: 'N/A',
            postal_code: 'N/A',
            zip_code: 'N/A'
          }
        };

        const response = await axios.post('/functions/v1/pesapal-proxy', {
          action: 'payment',
          data: {
            token: token,
            paymentData: payload
          }
        });

        if (response.data && response.data.redirect_url) {
          return {
            success: true,
            message: 'Payment initiated successfully',
            checkoutUrl: response.data.redirect_url,
            transactionId: response.data.order_tracking_id
          };
        } else {
          throw new Error('Failed to initiate payment');
        }
      }
    } catch (error: any) {
      console.error('Error initiating M-Pesa payment:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to initiate payment',
        error: error.message
      };
    }
  }

  // Initiate card payment
  async initiateCardPayment(paymentData: PesapalCardPaymentRequest): Promise<PesapalPaymentResponse> {
    try {
      const token = await this.getAccessToken();

      if (isDevelopment) {
        // Development mode - simulated payment
        console.log('Development mode: Simulating card payment initiation', paymentData);
        
        return {
          success: true,
          message: 'Payment initiated successfully (Development Mode)',
          checkoutUrl: `${window.location.origin}/payment/callback?pesapal_transaction_tracking_id=dev_${Date.now()}&order_number=${paymentData.orderNumber}`,
          transactionId: `dev_${Date.now()}`
        };
      } else {
        // Production mode - use backend proxy
        const payload = {
          id: paymentData.orderNumber,
          currency: 'KES',
          amount: paymentData.amount,
          description: paymentData.description || 'Payment for TechMart order',
          callback_url: `${window.location.origin}/payment/callback`,
          notification_id: 'your_notification_id',
          billing_address: {
            email_address: paymentData.customerEmail,
            phone_number: paymentData.customerPhone,
            country_code: 'KE',
            first_name: paymentData.customerName.split(' ')[0] || '',
            last_name: paymentData.customerName.split(' ').slice(1).join(' ') || '',
            line_1: 'N/A',
            line_2: 'N/A',
            city: 'N/A',
            state: 'N/A',
            postal_code: 'N/A',
            zip_code: 'N/A'
          },
          card_details: {
            card_number: paymentData.cardNumber.replace(/\s/g, ''),
            expiry_month: paymentData.expiryMonth,
            expiry_year: paymentData.expiryYear,
            cvv: paymentData.cvv,
            card_holder_name: paymentData.cardHolderName
          }
        };

        const response = await axios.post('/functions/v1/pesapal-proxy', {
          action: 'payment',
          data: {
            token: token,
            paymentData: payload
          }
        });

        if (response.data && response.data.redirect_url) {
          return {
            success: true,
            message: 'Payment initiated successfully',
            checkoutUrl: response.data.redirect_url,
            transactionId: response.data.order_tracking_id
          };
        } else {
          throw new Error('Failed to initiate payment');
        }
      }
    } catch (error: any) {
      console.error('Error initiating card payment:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Failed to initiate payment',
        error: error.message
      };
    }
  }

  // Check payment status
  async checkPaymentStatus(transactionId: string): Promise<PesapalStatusResponse> {
    try {
      if (isDevelopment) {
        // Development mode - simulate status check
        if (transactionId.startsWith('dev_')) {
          console.log('Development mode: Simulating payment status check', transactionId);
          
          return {
            success: true,
            status: 'COMPLETED',
            message: 'Payment completed successfully (Development Mode)',
            transactionId: transactionId,
            amount: 1000,
            paymentMethod: 'M-Pesa'
          };
        }
      } else {
        // Production mode - use backend proxy
        const token = await this.getAccessToken();

        const response = await axios.post('/functions/v1/pesapal-proxy', {
          action: 'status',
          data: {
            token: token,
            trackingId: transactionId
          }
        });

        if (response.data) {
          const status = response.data.payment_status_description;
          let mappedStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

          switch (status?.toUpperCase()) {
            case 'COMPLETED':
            case 'SUCCESS':
              mappedStatus = 'COMPLETED';
              break;
            case 'FAILED':
            case 'ERROR':
              mappedStatus = 'FAILED';
              break;
            case 'CANCELLED':
              mappedStatus = 'CANCELLED';
              break;
            default:
              mappedStatus = 'PENDING';
          }

          return {
            success: true,
            status: mappedStatus,
            message: response.data.payment_status_description || 'Status checked successfully',
            transactionId: response.data.order_tracking_id,
            amount: response.data.amount,
            paymentMethod: response.data.payment_method
          };
        }
      }
      
      throw new Error('Invalid response from Pesapal');
    } catch (error: any) {
      console.error('Error checking payment status:', error);
      return {
        success: false,
        status: 'FAILED',
        message: error.response?.data?.error || 'Failed to check payment status',
        error: error.message
      };
    }
  }

  // Get IPN (Instant Payment Notification) URL
  getIPNUrl(): string {
    return `${config.baseUrl}/api/Transactions/GetTransactionStatus`;
  }
}

export const pesapalService = new PesapalService();
export default pesapalService; 