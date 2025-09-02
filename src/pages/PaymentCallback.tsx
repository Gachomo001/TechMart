import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
// Import removed as it's not used

const PaymentCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Verifying payment...');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [amount, setAmount] = useState<number | null>(null);

  // Maximum number of retries for payment verification
  const MAX_RETRIES = 30; // Increased from 10 to 30 (90 seconds total)
  const RETRY_DELAY = 3000; // 3 seconds
  const [retryCount, setRetryCount] = useState(0);
  const [isVerifying, setIsVerifying] = useState(true);
  
  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    let retryTimeout: NodeJS.Timeout;

    // Function to get pending payment from session storage or URL params
    const getPendingPayment = () => {
      try {
        // First try to get from session storage
        const pendingPayment = sessionStorage.getItem('pendingPayment');
        if (pendingPayment) {
          return JSON.parse(pendingPayment);
        }
        
        // Fallback to URL parameters if session storage is empty
        const urlParams = new URLSearchParams(window.location.search);
        const paymentId = urlParams.get('payment_id');
        const orderId = urlParams.get('order_id');
        const requestId = urlParams.get('request_id') || `verify_${Date.now()}`;
        
        if (paymentId && orderId) {
          return {
            paymentId,
            orderId,
            requestId,
            amount: 0,
            timestamp: new Date().toISOString(),
            status: 'pending'
          };
        }
        
        return null;
      } catch (error) {
        console.error('Error getting pending payment:', error);
        return null;
      }
    };

    const verifyPayment = async (paymentId: string, currentRetry: number = 0) => {
      if (!isMounted) return;
      
      try {
        // Get the pending payment with fallback to URL params
        const pendingPayment = getPendingPayment();
        if (!pendingPayment) {
          throw new Error('No pending payment found in session or URL parameters');
        }
        
        const { orderId, requestId } = pendingPayment;
        setOrderNumber(orderId);
        setRetryCount(currentRetry + 1);
        
        // If we got here from URL params, update session storage for consistency
        if (!sessionStorage.getItem('pendingPayment') && pendingPayment) {
          sessionStorage.setItem('pendingPayment', JSON.stringify(pendingPayment));
        }
        
        console.log(`[${requestId || 'no-request-id'}] [Attempt ${currentRetry + 1}/${MAX_RETRIES}] Verifying payment status for payment:`, paymentId);
        
        console.log(`[${requestId || 'no-request-id'}] Verifying payment status for payment:`, paymentId);
        
        // Verify payment status with the server
        const verifyUrl = `/api/payment/card/verify/${paymentId}`;
        console.log(`[${requestId || 'no-request-id'}] Verifying payment at:`, verifyUrl);
        
        const response = await fetch(verifyUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'X-Request-ID': requestId || `verify_${Date.now()}`
          },
          credentials: 'include'
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || 
                             errorData.error?.message || 
                             `HTTP error! status: ${response.status}`;
                              
          console.error(`[${requestId || 'no-request-id'}] Payment verification failed:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
            response: errorData
          });
          
          throw new Error(`Payment verification failed: ${errorMessage}`);
        }
        
        const data = await response.json();
        console.log(`[${requestId || 'no-request-id'}] Verification response:`, data);
        
        // Handle both response formats:
        // 1. { success: true, data: { ...payment } }
        // 2. { status: 'success', payment: { ... } }
        const payment = data.data || data.payment || data;
        
        if ((data.status === 'success' || data.success === true) && payment) {
          // Handle successful payment verification
          setPaymentStatus(payment.status);
          setOrderNumber(payment.order_id);
          
          if (payment.amount) {
            setAmount(parseFloat(payment.amount));
          }

          // Clear the pending payment from session storage
          sessionStorage.removeItem('pendingPayment');
          
          // Handle different payment statuses
          // Handle different payment statuses
          if (payment.status === 'succeeded') {
            setStatus('success');
            setMessage('Payment completed successfully!');
            setPaymentStatus('succeeded');
            
            // Redirect to success page after a short delay
            setTimeout(() => {
              navigate(`/order/${payment.order_id}`, { replace: true });
            }, 2000);

            // Clear the pending payment data
            sessionStorage.removeItem('pendingPayment');
          } else if (payment.status === 'requires_3ds_verification') {
            if (currentRetry >= MAX_RETRIES - 1) {
              setStatus('failed');
              setMessage('3D Secure verification timed out. Please check your email for payment confirmation or contact support.');
              setIsVerifying(false);
              return;
            }

            setMessage(`Waiting for 3D Secure verification... (${currentRetry + 1}/${MAX_RETRIES})`);

            console.log(`[${requestId}] Waiting for 3DS verification. Checking again in ${RETRY_DELAY}ms... (${currentRetry + 1}/${MAX_RETRIES})`);

            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));

            if (isMounted) {
              await verifyPayment(paymentId, currentRetry + 1);
            }
            return;
          } else if (payment.status === 'pending') {
            retryCount++;
            if (retryCount < MAX_RETRIES) {
              const delay = Math.min(1000 * Math.pow(2, retryCount), 10000); // Exponential backoff, max 10s
              console.log(`[${requestId}] Payment still pending. Retrying in ${delay}ms... (${retryCount + 1}/${MAX_RETRIES})`);

              retryTimeout = setTimeout(() => {
                verifyPayment(paymentId, retryCount);
              }, delay);
            } else {
              // Max retries reached
              setMessage('Payment verification timed out. Please check your email for confirmation or contact support.');
              setStatus('failed');
              sessionStorage.removeItem('pendingPayment');
            }
          } else if (payment.status === 'failed' || payment.status === 'cancelled') {
            setMessage(`Payment ${payment.status}. Please try again or use a different payment method.`);
            setStatus('failed');
            setPaymentStatus('failed');
            sessionStorage.removeItem('pendingPayment');
          } else {
            // Unknown status
            console.warn(`[${requestId}] Unknown payment status:`, payment.status);
            setStatus('failed');
            setMessage('Unable to determine payment status. Please contact support.');
            setPaymentStatus('unknown');
            sessionStorage.removeItem('pendingPayment');
          }
        } else {
          // Handle unknown status
          console.warn(`[${requestId || 'no-request-id'}] Unknown payment status in response:`, payment.status || 'unknown');
          setStatus('failed');
          setMessage('Unable to determine payment status. Please contact support.');
          setPaymentStatus(payment.status || 'unknown');

          // Log full response for debugging
          console.warn('Full payment verification response:', data);
        }
      } catch (error: unknown) {
        console.error('Error verifying payment:', error);
        setStatus('failed');
        setMessage(error instanceof Error ? error.message : 'Failed to verify payment status');
      }
    };

    const processPaymentCallback = async () => {
      try {
        // Get parameters from URL
        const paymentId = searchParams.get('payment_id');
        const status = searchParams.get('status');
        const requestId = searchParams.get('request_id');

        // Try to get payment info from session storage first
        const pendingPayment = sessionStorage.getItem('pendingPayment');
        const paymentData = pendingPayment ? JSON.parse(pendingPayment) : null;

        // Determine the payment ID to use (URL param takes precedence over session storage)
        const effectivePaymentId = paymentId || (paymentData?.paymentId || '');

        if (effectivePaymentId) {
          // We have a payment ID, verify the payment
          console.log(`[${requestId || paymentData?.requestId || 'no-request-id'}] Processing payment callback for payment:`, effectivePaymentId);
          await verifyPayment(effectivePaymentId);
          return;
        }

        // Fallback to order_number for backward compatibility
        const orderNumber = searchParams.get('order_number');
        if (orderNumber) {
          console.warn(`Using legacy order_number parameter. Payment ID is recommended.`);
          setOrderNumber(orderNumber);

          if (status === 'success') {
            setStatus('success');
            setMessage('Payment completed successfully!');
            setPaymentStatus('succeeded');
          } else {
            setStatus('failed');
            setMessage(status || 'Payment was not completed');
            setPaymentStatus('failed');
          }
        } else {
          // No valid payment reference found
          const errorMessage = 'Invalid or missing payment reference';
          console.error(errorMessage, { paymentId, orderNumber });
          throw new Error(errorMessage);
        }
      } catch (error: any) {
        console.error('Error processing payment callback:', error);
        setStatus('failed');
        setMessage(error.message || 'An error occurred while processing the payment');
      }
    };

    processPaymentCallback();

    // Cleanup function to clear any pending timeouts
    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [searchParams, orderNumber]);

  const handleViewOrder = () => {
    if (orderNumber) {
      navigate(`/orders/${orderNumber}`);
    } else {
      navigate('/profile/orders');
    }
  };

  const handleRetry = () => {
    navigate('/checkout');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        {status === 'loading' ? (
          <div className="flex flex-col items-center">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {isVerifying ? 'Verifying Payment' : 'Processing Payment'}
            </h2>
            <p className="text-gray-600">{message}</p>
            {isVerifying && (
              <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${Math.min(100, (retryCount / MAX_RETRIES) * 100)}%` }}
                />
              </div>
            )}
            {isVerifying && retryCount > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Attempt {retryCount} of {MAX_RETRIES}
              </p>
            )}
          </div>
        ) : (
          <>
            <h2 className="text-xl font-medium text-gray-900 mb-4">
              {status === 'success' ? 'Payment Successful!' : 'Payment Failed'}
            </h2>
            <p className="text-gray-600 mb-6">{message}</p>
          </>
        )}
        
        {paymentStatus && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-sm font-medium text-blue-800">
              Payment Status: <span className="capitalize">{paymentStatus}</span>
            </p>
            {paymentStatus === 'pending' && (
              <p className="mt-1 text-sm text-blue-700">
                Your payment is being processed. This may take a few moments...
              </p>
            )}
            {paymentStatus === 'succeeded' && amount && (
              <p className="mt-1 text-sm text-green-700">
                Amount: KES {amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {status === 'failed' && (
            <>
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={handleViewOrder}
                className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
              >
                {orderNumber ? 'View Order' : 'View Orders'}
              </button>
              <button
                onClick={() => navigate('/contact')}
                className="w-full border border-gray-300 bg-white text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Contact Support
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback; 