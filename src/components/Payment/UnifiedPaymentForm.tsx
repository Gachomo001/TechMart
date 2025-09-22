import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { CreditCard, Smartphone, Shield, Clock, Apple } from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
// import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
// import { Order } from '../../../types';
import OrderConfirmationModal from '../OrderConfirmationModal';

// Custom Google Pay icon component
const GooglePayIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/>
  </svg>
);

// Define the component's props
interface UnifiedPaymentFormProps {
  amount: number;
  onPaymentComplete: (response: any) => void;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  disabled?: boolean;
  shippingInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    county: string;
    region: string;
    country: string;
    shippingType: string;
    customCounty?: string;
    customRegion?: string;
    isCustomLocation?: boolean;
  };
  shippingCost?: number;
}

const UnifiedPaymentForm: React.FC<UnifiedPaymentFormProps> = ({
  amount,
  email,
  firstName,
  lastName,
  phone,
  disabled = false,
  onPaymentComplete,
  shippingInfo,
  shippingCost,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSdkReady, setIsSdkReady] = useState(false);
  const [intaSendInstance, setIntaSendInstance] = useState<any>(null);
  const [paymentTimeout, setPaymentTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showOrderConfirmationModal, setShowOrderConfirmationModal] = useState(false);
  const [orderData, setOrderData] = useState<{
    orderNumber: string;
    orderNumberDisplay: string;
    paymentMethod: 'card' | 'mpesa' | 'apple-pay' | 'google-pay';
    paymentDetails?: any;
  } | null>(null);
  const {clearCart, state } = useCart();
  const items = state.items;
  // const { user } = useAuth();

  // Load the IntaSend SDK script
  useEffect(() => {
    console.log('[UnifiedPayment] Initializing IntaSend SDK...');
    
    // Add custom CSS for wider modal
    const style = document.createElement('style');
    style.textContent = `
      .intasend-modal {
        max-width: 800px !important;
        width: 90vw !important;
      }
      .intasend-modal .modal-content {
        max-width: 100% !important;
        width: 100% !important;
      }
      
      /* Force vertical layout for payment methods */
      .intasend-modal .payment-methods-container,
      .intasend-modal .payment-options,
      .intasend-modal .methods-grid,
      .intasend-modal .payment-grid {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
      }
      
      /* Style individual payment method buttons */
      .intasend-modal .payment-method,
      .intasend-modal .method-option,
      .intasend-modal .payment-option {
        width: 100% !important;
        margin: 0 !important;
        margin-bottom: 8px !important;
        display: block !important;
      }
      
      /* Remove any grid or flex-wrap that causes side-by-side layout */
      .intasend-modal .payment-methods-grid {
        grid-template-columns: 1fr !important;
      }
      
      @media (max-width: 768px) {
        .intasend-modal {
          width: 95vw !important;
          max-width: 95vw !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    if (window.IntaSend) {
      console.log('[UnifiedPayment] IntaSend SDK already available');
      initializeIntaSend();
      return;
    }

    if (document.querySelector('script[src*="intasend-inline"]')) {
      console.log('[UnifiedPayment] SDK script already loaded, waiting for IntaSend object...');
      const timer = setTimeout(() => {
        if (window.IntaSend) {
          console.log('[UnifiedPayment] IntaSend SDK now available after delay');
          initializeIntaSend();
        } else {
          console.error('[UnifiedPayment] IntaSend SDK still not available after delay');
          toast.error('Payment service failed to initialize. Please refresh the page.');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }

    console.log('[UnifiedPayment] Loading IntaSend SDK script...');
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/intasend-inlinejs-sdk@4.0.7/build/intasend-inline.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    script.onload = () => {
      console.log('[UnifiedPayment] IntaSend SDK script loaded successfully');
      if (window.IntaSend) {
        initializeIntaSend();
      } else {
        console.error('[UnifiedPayment] IntaSend object not available after script load');
        toast.error('Payment service failed to initialize properly.');
      }
    };

    script.onerror = (error) => {
      console.error('[UnifiedPayment] Failed to load IntaSend SDK script:', error);
      toast.error('Payment service failed to load. Please refresh the page.');
      setIsSdkReady(false);
    };

    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src*="intasend-inline"]');
      if (existingScript && existingScript.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
    };
  }, []);

  const initializeIntaSend = () => {
    console.log('[UnifiedPayment] Initializing IntaSend instance...');
    
    // Temporary debug logging for production troubleshooting
    console.log('[UnifiedPayment] Environment debug:', {
      NODE_ENV: import.meta.env.MODE,
      PROD: import.meta.env.PROD,
      hasPublishableKey: !!import.meta.env.VITE_INTASEND_PUBLISHABLE_KEY,
      publishableKeyPrefix: import.meta.env.VITE_INTASEND_PUBLISHABLE_KEY?.substring(0, 20) + '...',
      allEnvKeys: Object.keys(import.meta.env).filter(key => key.includes('INTASEND'))
    });
    
    const publishableKey = import.meta.env.VITE_INTASEND_PUBLISHABLE_KEY;
    if (!publishableKey) {
      console.error('[UnifiedPayment] Missing publishable key');
      console.error('[UnifiedPayment] Available env vars:', Object.keys(import.meta.env));
      toast.error('Payment gateway is not configured. Please contact support.');
      return;
    }

    console.log('[UnifiedPayment] Creating IntaSend instance with config:', {
      hasPublishableKey: !!publishableKey,
      live: import.meta.env.PROD,
      mode: 'popup'
    });

    try {
      const intaSend = new window.IntaSend({
        publicAPIKey: publishableKey,
        live: import.meta.env.PROD,
        mode: 'popup',
      });

      // Set up event listeners
      intaSend
        .on('COMPLETE', async (response: any) => {
          console.log('[UnifiedPayment] Payment completed:', response);
          setIsLoading(false);
          
          try {
            // Use existing orderData if available, otherwise initialize with UUID
            let actualOrderNumber = orderData?.orderNumber || (window as any)._tm_current_order_id || `TEMP-${Date.now()}`;
            let humanReadableOrderNumber = orderData?.orderNumberDisplay || actualOrderNumber;
            
            // Only fetch from database if we don't already have the human-readable number
            if ((window as any)._tm_current_order_id && (!orderData?.orderNumberDisplay || orderData.orderNumberDisplay === orderData.orderNumber)) {
              try {
                // Add small delay to ensure database transaction is committed
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                console.log('[UnifiedPayment] Fetching order details for ID:', (window as any)._tm_current_order_id);
                const { data: orderData, error: orderError } = await supabase
                  .from('orders')
                  .select('order_number')
                  .eq('id', (window as any)._tm_current_order_id)
                  .single();
                
                console.log('[UnifiedPayment] Database response:', { orderData, orderError });
                
                if (!orderError && orderData?.order_number) {
                  humanReadableOrderNumber = orderData.order_number;
                  actualOrderNumber = (window as any)._tm_current_order_id; // Keep UUID for internal reference
                  console.log('[UnifiedPayment] Retrieved human-readable order number:', humanReadableOrderNumber);
                } else {
                  console.warn('[UnifiedPayment] Could not fetch order_number from database:', orderError);
                }
              } catch (fetchError) {
                console.warn('[UnifiedPayment] Error fetching order details:', fetchError);
              }
            }

            // Map provider -> payment method for UI
            const provider = (response && (response.provider || response.channel)) || '';
            const providerLower = String(provider).toLowerCase();
            let paymentMethod: 'card' | 'mpesa' | 'apple-pay' | 'google-pay' = 'card';
            if (providerLower.includes('mpesa')) paymentMethod = 'mpesa';
            else if (providerLower.includes('apple')) paymentMethod = 'apple-pay';
            else if (providerLower.includes('google')) paymentMethod = 'google-pay';

            // Prepare order confirmation payload for the landing page modal
            const confirmationPayload = {
              orderNumber: actualOrderNumber, // UUID for internal reference
              orderNumberDisplay: humanReadableOrderNumber, // Human-readable for display
              items,
              orderTotals: {
                subtotal: amount - (shippingCost || 0),
                tax: (amount - (shippingCost || 0)) * 0.16,
                shippingCost: shippingCost || 0,
                total: amount,
              },
              shippingInfo,
              paymentMethod,
              paymentDetails: response,
            };
            try {
              localStorage.setItem('orderConfirmation', JSON.stringify(confirmationPayload));
            } catch (storageErr) {
              console.warn('[UnifiedPayment] Failed to persist confirmation payload:', storageErr);
            }

            // Fire-and-forget backend notification without blocking redirect
            try {
              const payload = JSON.stringify({
                transaction_id: response?.tracking_id || response?.invoice_id || response?.id,
                api_ref: response?.api_ref,
                status: 'completed',
                transaction_data: response
              });
              const url = '/api/payment/card/complete';
              if (navigator.sendBeacon) {
                const blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon(url, blob);
              } else {
                // Fallback: non-blocking fetch without await
                fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload }).catch(() => {});
              }
            } catch (notifyErr) {
              console.warn('[UnifiedPayment] Non-blocking notify failed to schedule:', notifyErr);
            }

            // Call parent callback (non-blocking)
            try { onPaymentComplete(response); } catch {}

            // Instant redirect to landing with order_confirm flag
            const url = new URL(window.location.href);
            url.pathname = '/';
            url.searchParams.set('order_confirm', '1');
            // Use replace to avoid extra history entry and make it immediate
            window.location.replace(url.toString());

          } catch (error) {
            console.error('[UnifiedPayment] Error in payment completion flow:', error);
            const url = new URL(window.location.href);
            url.pathname = '/';
            url.searchParams.set('order_confirm', '1');
            window.location.replace(url.toString());
          }
        })
        .on('FAILED', async (response: any) => {
          console.error('[UnifiedPayment] Payment failed:', response);
          setIsLoading(false);
          
          try {
            await notifyPaymentCompletion('failed', response);
          } catch (error) {
            console.error('[UnifiedPayment] Error notifying backend about failure:', error);
          }
          
          toast.error('Payment failed. Please try again.');
        })
        .on('IN-PROGRESS', (response: any) => {
          console.log('[UnifiedPayment] Payment in progress:', response);
        });

      setIntaSendInstance(intaSend);
      setIsSdkReady(true);
      console.log('[UnifiedPayment] IntaSend instance initialized successfully');
    } catch (error) {
      console.error('[UnifiedPayment] Error initializing IntaSend:', error);
      toast.error('Failed to initialize payment service.');
      setIsSdkReady(false);
    }
  };

  // Function to notify backend about payment completion
  const notifyPaymentCompletion = async (status: 'completed' | 'failed' | 'cancelled', transactionData: any) => {
    console.log('[UnifiedPayment] Notifying backend about payment completion:', { status, transactionData });
    
    try {
      // Get the current session from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.warn('[UnifiedPayment] No valid session found for backend notification:', sessionError);
        return;
      }

      const response = await fetch('/api/payment/card/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          transaction_id: transactionData?.tracking_id || transactionData?.invoice_id || transactionData?.id,
          api_ref: transactionData?.api_ref,
          status,
          transaction_data: transactionData
        })
      });

      if (!response.ok) {
        throw new Error(`Backend notification failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('[UnifiedPayment] Backend notification successful:', result);
      
    } catch (error) {
      console.error('[UnifiedPayment] Failed to notify backend:', error);
      throw error;
    }
  };

  const handlePayClick = async () => {
    console.log('[UnifiedPayment] Pay button clicked');
    
    if (!isSdkReady || !intaSendInstance) {
      console.warn('[UnifiedPayment] SDK not ready or instance not available');
      toast.error('Payment service is still initializing. Please wait...');
      return;
    }

    if (disabled) {
      console.warn('[UnifiedPayment] Payment button is disabled');
      return;
    }

    console.log('[UnifiedPayment] Starting payment process with data:', {
      amount,
      email,
      firstName,
      lastName,
      phone,
      currency: 'KES'
    });

    // Clear previous errors and set loading state
    setIsLoading(true);

    try {
      // Generate a simple API reference for tracking
      const apiRef = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('[UnifiedPayment] Generated API reference:', apiRef);

      // Store order ID for later use
      const tempOrderId = `temp_${Date.now()}`;
      (window as any)._tm_current_order_id = tempOrderId;

      // Directly open IntaSend popup without backend initialization
      const paymentData = {
        amount: amount,
        currency: 'KES',
        email: email,
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        api_ref: apiRef,
        redirect_url: `${window.location.origin}/checkout/complete`
      };

      console.log('[UnifiedPayment] Initiating payment with data:', paymentData);
      await intaSendInstance.run(paymentData);
      console.log('[UnifiedPayment] Payment modal opened successfully');
      
      const timeoutId = setTimeout(() => {
        if (isLoading) {
          console.log('[UnifiedPayment] Payment modal cancelled by user (timeout)');
          setIsLoading(false);
          toast.info('Payment cancelled. You can try again anytime.');
        }
      }, 30000); // 30 seconds
      setPaymentTimeout(timeoutId);
      
    } catch (error) {
      console.error('[UnifiedPayment] Error initiating payment:', error);
      setIsLoading(false);
      toast.error('Could not initiate payment. Please try again.');
    }
  };

  useEffect(() => {
    return () => {
      if (paymentTimeout) {
        clearTimeout(paymentTimeout);
      }
    };
  }, [paymentTimeout]);

  const paymentMethods = [
    {
      id: 'mpesa',
      name: 'M-Pesa',
      description: 'Pay with your M-Pesa mobile money',
      icon: <Smartphone className="w-6 h-6" />,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      id: 'card',
      name: 'Credit/Debit Card',
      description: 'Visa, Mastercard, and other cards',
      icon: <CreditCard className="w-6 h-6" />,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
    },
    {
      id: 'apple-pay',
      name: 'Apple Pay',
      description: 'Quick and secure payments with Touch ID',
      icon: <Apple className="w-6 h-6" />,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
      borderColor: 'border-gray-500/20'
    },
    {
      id: 'google-pay',
      name: 'Google Pay',
      description: 'Fast checkout with your Google account',
      icon: <GooglePayIcon />,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Payment Methods Overview */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Secure Payment Options</h3>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`${method.bgColor} ${method.borderColor} border rounded-lg p-4 transition-all hover:scale-[1.02]`}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className={method.color}>
                  {method.icon}
                </div>
                <h4 className="font-medium text-white">{method.name}</h4>
              </div>
              <p className="text-sm text-slate-300">{method.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Status */}
      {!isSdkReady && (
        <div className="flex items-center justify-center p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-yellow-600 animate-pulse" />
            <span className="text-yellow-800 text-sm">Initializing secure payment service...</span>
          </div>
        </div>
      )}

      {/* Payment Summary */}
      <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-300">Total Amount:</span>
          <span className="text-2xl font-bold text-white">KES {amount.toLocaleString()}</span>
        </div>
      </div>

      {/* Fallback Pay Button */}
      <button
        type="button"
        onClick={handlePayClick}
        className={`w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-[1.02] ${
          disabled || isLoading || !isSdkReady ? 'opacity-50 cursor-not-allowed transform-none' : ''
        }`}
        disabled={disabled || isLoading || !isSdkReady}
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Opening Payment Options...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center space-x-3">
            <CreditCard className="w-5 h-5" />
            <span>Choose Payment Method - KES {amount.toLocaleString()}</span>
          </div>
        )}
      </button>

      {/* Payment Security Info */}
      <div className="text-center space-y-2">
        <p className="text-xs text-slate-500">
          Your payment information is secure and never stored on our servers
        </p>
        <div className="mt-4 p-3 bg-slate-700/30 rounded-lg">
          <div className="flex items-center justify-center">
            <span style={{display: 'block', textAlign: 'center'}}>
              <a href="https://intasend.com/security" target="_blank" rel="noopener noreferrer">
                <img 
                  src="https://intasend-prod-static.s3.amazonaws.com/img/trust-badges/intasend-trust-badge-with-mpesa-hr-dark.png" 
                  width="700" 
                  alt="IntaSend Secure Payments (PCI-DSS Compliant)"
                  className="max-w-full h-auto"
                />
              </a>
              <strong>
                <a 
                  style={{display: 'block', color: '#fafafa', textDecoration: 'none', fontSize: '0.8em', marginTop: '0.6em'}} 
                  href="https://intasend.com/security" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Secured by IntaSend Payments
                </a>
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {showOrderConfirmationModal && orderData && shippingInfo && (
        <OrderConfirmationModal
          isOpen={showOrderConfirmationModal}
          orderNumber={orderData.orderNumber}
          orderNumberDisplay={orderData.orderNumberDisplay}
          orderItems={items}
          orderTotals={{
            subtotal: amount - (shippingCost || 0),
            tax: (amount - (shippingCost || 0)) * 0.16,
            shippingCost: shippingCost || 0,
            total: amount,
          }}
          shippingInfo={shippingInfo}
          paymentMethod={orderData.paymentMethod}
          paymentDetails={orderData.paymentDetails}
          onContinueShopping={() => {
            setShowOrderConfirmationModal(false);
            clearCart();
          }}
        />
      )}
    </div>
  );
};

export default UnifiedPaymentForm;
