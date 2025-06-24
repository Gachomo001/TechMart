import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import pesapalService from '../lib/pesapal';

const PaymentCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('Processing payment...');

  useEffect(() => {
    const processPaymentCallback = async () => {
      try {
        // Get parameters from URL
        const orderTrackingId = searchParams.get('pesapal_transaction_tracking_id');
        const orderNumber = searchParams.get('order_number');

        if (!orderTrackingId) {
          setStatus('failed');
          setMessage('Invalid payment response');
          return;
        }

        // Check payment status with Pesapal
        const paymentStatus = await pesapalService.checkPaymentStatus(orderTrackingId);

        if (paymentStatus.success && paymentStatus.status === 'COMPLETED') {
          // Update order status in database
          if (orderNumber) {
            const { error } = await supabase
              .from('orders')
              .update({
                status: 'processing',
                payment_status: 'paid',
                payment_details: {
                  ...paymentStatus,
                  transactionId: orderTrackingId
                }
              })
              .eq('order_number', orderNumber);

            if (error) {
              console.error('Error updating order:', error);
            }
          }

          setStatus('success');
          setMessage('Payment completed successfully!');
        } else {
          // Update order status to failed
          if (orderNumber) {
            const { error } = await supabase
              .from('orders')
              .update({
                status: 'cancelled',
                payment_status: 'failed',
                payment_details: {
                  ...paymentStatus,
                  transactionId: orderTrackingId
                }
              })
              .eq('order_number', orderNumber);

            if (error) {
              console.error('Error updating order:', error);
            }
          }

          setStatus('failed');
          setMessage(paymentStatus.message || 'Payment failed');
        }
      } catch (error) {
        console.error('Error processing payment callback:', error);
        setStatus('failed');
        setMessage('An error occurred while processing the payment');
      }
    };

    processPaymentCallback();
  }, [searchParams]);

  const handleContinue = () => {
    navigate('/');
  };

  const handleViewOrders = () => {
    navigate('/profile');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          {status === 'loading' && (
            <div className="mb-6">
              <Loader2 className="mx-auto h-16 w-16 text-blue-500 animate-spin" />
            </div>
          )}

          {status === 'success' && (
            <div className="mb-6">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500" />
            </div>
          )}

          {status === 'failed' && (
            <div className="mb-6">
              <XCircle className="mx-auto h-16 w-16 text-red-500" />
            </div>
          )}

          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {status === 'loading' && 'Processing Payment...'}
            {status === 'success' && 'Payment Successful!'}
            {status === 'failed' && 'Payment Failed'}
          </h2>

          <p className="text-gray-600 mb-8">{message}</p>

          <div className="space-y-3">
            {status === 'success' && (
              <>
                <button
                  onClick={handleViewOrders}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View My Orders
                </button>
                <button
                  onClick={handleContinue}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Continue Shopping
                </button>
              </>
            )}

            {status === 'failed' && (
              <>
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={handleContinue}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Continue Shopping
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCallback; 