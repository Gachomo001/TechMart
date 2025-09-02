import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ThreeDSVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [paymentId, setPaymentId] = useState('');
  const [orderId, setOrderId] = useState('');
  const [requestId, setRequestId] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const paymentId = searchParams.get('payment_id');
        const orderId = searchParams.get('order_id');
        const requestId = searchParams.get('request_id');

        if (!paymentId) {
          throw new Error('Missing payment ID');
        }

        setPaymentId(paymentId);
        setOrderId(orderId || '');
        setRequestId(requestId || `3ds_${Date.now()}`);

        // Check payment status
        const response = await fetch(`/api/payment/card/verify/${paymentId}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'X-Request-ID': requestId || `3ds_${Date.now()}`
          },
          credentials: 'include'
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.message || 'Failed to verify payment');
        }

        const data = await response.json();
        const payment = data.data || data.payment || data;

        if (payment.status === 'succeeded') {
          // Payment already succeeded, redirect to success
          navigate(`/payment/success?payment_id=${paymentId}&order_id=${payment.order_id || orderId}`);
          return;
        }

        if (payment.status !== 'requires_3ds_verification') {
          throw new Error('3D Secure verification is not required for this payment');
        }

        setLoading(false);
      } catch (err: any) {
        console.error('3DS Verification Error:', err);
        setError(err.message || 'Failed to initialize 3D Secure verification');
        setLoading(false);
      }
    };

    init();
  }, [searchParams, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/payment/card/3ds/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'X-Request-ID': requestId
        },
        body: JSON.stringify({
          payment_id: paymentId,
          order_id: orderId,
          otp: otp.trim()
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Verification failed');
      }

      // Redirect to success page
      navigate(`/payment/success?payment_id=${paymentId}&order_id=${orderId}`);
    } catch (err: any) {
      console.error('3DS Verification Error:', err);
      setError(err.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900">Preparing 3D Secure verification...</p>
          <p className="mt-2 text-sm text-gray-600">Please wait while we connect to your bank.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-sm border border-red-100">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="mt-3 text-lg font-medium text-gray-900">Verification Error</h3>
            <div className="mt-2 text-sm text-gray-600">
              <p>{error}</p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          3D Secure Verification
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Please enter the verification code sent to your mobile device
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label
                htmlFor="otp"
                className="block text-sm font-medium text-gray-700"
              >
                Verification Code
              </label>
              <div className="mt-1">
                <input
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                We've sent a verification code to your mobile device.
              </p>
            </div>

            <div>
              <button
                type="submit"
                disabled={submitting || !otp.trim()}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  submitting || !otp.trim()
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                    Verifying...
                  </>
                ) : (
                  'Verify Payment'
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Need help?</span>
              </div>
            </div>

            <div className="mt-6">
              <p className="text-center text-sm text-gray-600">
                Didn't receive a code?{' '}
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-500"
                  onClick={() => window.location.reload()}
                >
                  Resend code
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
