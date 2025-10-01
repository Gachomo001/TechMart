import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  CreditCard,  Smartphone, Shield, Clock, Building2, Info, Loader, Banknote } from 'lucide-react';import { useCart } from '../../contexts/CartContext';
import { supabase } from '../../lib/supabase';
import OrderConfirmationModal from '../OrderConfirmationModal';
import { CartItem } from '../../types/index';
// Define the component's props (same as before)
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
  const [paystackInstance, setPaystackInstance] = useState<any>(null);
  // const [paymentTimeout, setPaymentTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showOrderConfirmationModal, setShowOrderConfirmationModal] = useState(false);
  // Add this line after your other variable declarations (around line 40-50)
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || import.meta.env.PAYSTACK_PUBLIC_KEY;
  // Update this type definition in your component or types file:
const [orderData] = useState<{
  orderNumber: string;
  orderNumberDisplay: string;
  paymentMethod: 'card' | 'mobile_money' | 'bank_transfer' | 'ussd';
  paymentDetails?: any;
} | null>(null);
  const {clearCart, state } = useCart();
  const items = state.items;

  // Load PayStack SDK
  useEffect(() => {
    console.log('[UnifiedPayment] Initializing PayStack SDK...');
    
    if (window.PaystackPop) {
      console.log('[UnifiedPayment] PayStack SDK already available');
      initializePayStack();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    script.onload = () => {
      if (window.PaystackPop) {
        initializePayStack();
      } else {
        toast.error('Payment service failed to initialize properly.');
      }
    };
    script.onerror = (error) => {
      console.error('[UnifiedPayment] Failed to load PayStack SDK script:', error);
      console.error('[UnifiedPayment] This could be due to network issues or PayStack CDN being unavailable');
      
      // Show more helpful error message
      toast.error('Unable to load payment service. Please check your internet connection and try again.');
      setIsSdkReady(false);
      
      // Optional: Try alternative CDN or fallback
      console.log('[UnifiedPayment] You may need to use a VPN or check your network settings');
    };
    document.head.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src*="paystack"]');
      if (existingScript?.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
    };
  }, []);

  const initializePayStack = () => {
    if (!publicKey) {
      console.error('[UnifiedPayment] PayStack public key is missing');
      toast.error('Payment gateway is not configured. Please contact support.');
      return;
    }
  
    // PaystackPop is not a constructor - use it directly
    setPaystackInstance(window.PaystackPop);
    setIsSdkReady(true);
    console.log('[UnifiedPayment] PayStack instance initialized successfully');
  };

  const handlePayClick = async () => {
    if (!isSdkReady || !window.PaystackPop || disabled) {
      toast.error('Payment service is still initializing. Please wait...');
      return;
    }
  
    if (!shippingInfo) {
      toast.error('Shipping information is required to complete the order.');
      return;
    }
  
    setIsLoading(true);
  
    try {
      // Generate unique reference
      const reference = `ps_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
      // Store payment context for verification
      const paymentContext = {
        reference,
        amount,
        shippingInfo,
        items,
        shippingCost
      };
      localStorage.setItem('paystack_payment_context', JSON.stringify(paymentContext));
  
      // Use PaystackPop.setup() method (correct way)
      const handler = window.PaystackPop.setup({
        key: publicKey,
        email: email,
        amount: Math.round(amount * 100), // PayStack expects kobo
        currency: 'KES',
        ref: reference,
        firstname: firstName,
        lastname: lastName,
        phone: phone.startsWith('+') ? phone : `+254${phone.replace(/^0/, '')}`,
        
        callback: function(response: any) {
          console.log('[UnifiedPayment] Payment completed:', response);
          setIsLoading(false);
          
          if (response.status === 'success') {
            handlePaymentSuccess(response);
          } else {
            console.log('[UnifiedPayment] Payment failed or cancelled:', response);
            toast.error('Payment was not completed successfully.');
            localStorage.removeItem('paystack_payment_context');
          }
        },
        
        onClose: function() {
          console.log('[UnifiedPayment] Payment modal closed');
          setIsLoading(false);
          toast.info('Payment cancelled. You can try again anytime.');
          localStorage.removeItem('paystack_payment_context');
        }
      });
  
      // Open the payment modal
      handler.openIframe();
  
    } catch (error) {
      console.error('[UnifiedPayment] Error initiating payment:', error);
      setIsLoading(false);
      toast.error('Could not initiate payment. Please try again.');
    }
  };

  // Make this function non-async to avoid PayStack callback issues
  const handlePaymentSuccess = function(transaction: any) {
    console.log('[UnifiedPayment] Processing payment success:', transaction);
    
    // Get stored payment context
    const contextStr = localStorage.getItem('paystack_payment_context');
    if (!contextStr) {
      console.error('[UnifiedPayment] Payment context not found');
      toast.error('Payment successful but order processing failed. Please contact support.');
      window.location.replace('/?order_confirm=1');
      return;
    }

    const paymentContext = JSON.parse(contextStr);
    
    // Verify transaction server-side (like IntaSend pattern)
    verifyAndCreateOrder(transaction, paymentContext);
  };

  /// Separate async function for order creation (like IntaSend pattern)
  const verifyAndCreateOrder = async (transaction: any, paymentContext: any) => {
    try {
      console.log('[UnifiedPayment] Creating order after successful payment...');

      // Map PayStack channel to payment method
      // NOTE: Frontend response doesn't include channel, need to verify on server
      console.log('[UnifiedPayment] PayStack transaction data:', {
        reference: transaction.reference,
        status: transaction.status,
        fullTransaction: transaction
      });

      // Verify transaction on server to get channel information
      let paymentMethod: 'card' | 'mobile_money' | 'bank_transfer' | 'ussd' = 'card';
      try {
        console.log('[UnifiedPayment] Verifying transaction on server...');
        
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(`/api/payment/paystack/verify/${transaction.reference}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const verificationData = await response.json();
          const serverChannel = verificationData.data?.channel || '';
          
          console.log('[UnifiedPayment] Server verification result:', {
            channel: serverChannel,
            verificationData: verificationData
          });

          // Map server channel to payment method
          const channelLower = serverChannel.toLowerCase();
          if (channelLower === 'mobile_money') {
            paymentMethod = 'mobile_money'; // Single category for all mobile money
          } else if (channelLower === 'card') {
            paymentMethod = 'card';
          } else if (channelLower === 'bank') {
            paymentMethod = 'bank_transfer';
          }
        } else {
          console.warn('[UnifiedPayment] Server verification failed, defaulting to card');
        }
      } catch (error) {
        console.error('[UnifiedPayment] Error verifying transaction:', error);
        console.warn('[UnifiedPayment] Defaulting to card payment method');
      }

      console.log('[UnifiedPayment] Final payment method mapping:', {
        detectedPaymentMethod: paymentMethod
      });

      // Create order directly (like IntaSend pattern)
      const order = await createOrderAfterPayment(paymentMethod, transaction, paymentContext);

      console.log('[UnifiedPayment] Order created successfully:', order);

      // Prepare confirmation payload
      const confirmationPayload = {
        orderNumber: order.id,
        orderNumberDisplay: order.order_number,
        items: paymentContext.items,
        orderTotals: {
          subtotal: paymentContext.amount - (paymentContext.shippingCost || 0),
          tax: (paymentContext.amount - (paymentContext.shippingCost || 0)) * 0.16,
          shippingCost: paymentContext.shippingCost || 0,
          total: paymentContext.amount,
        },
        shippingInfo: paymentContext.shippingInfo,
        paymentMethod,
        paymentDetails: transaction,
      };
      
      localStorage.setItem('orderConfirmation', JSON.stringify(confirmationPayload));
      localStorage.removeItem('paystack_payment_context');

      // Clear cart (this was missing!)
      clearCart();

      // Redirect to confirmation
      const url = new URL(window.location.href);
      url.pathname = '/';
      url.searchParams.set('order_confirm', '1');
      window.location.replace(url.toString());

    } catch (error) {
      console.error('[UnifiedPayment] Error in order creation:', error);
      toast.error('Payment successful but order creation failed. Please contact support.');
      localStorage.removeItem('paystack_payment_context');
      window.location.replace('/?order_confirm=1');
    }
  };

  // Create order after successful payment with correct payment method
  const createOrderAfterPayment = async (paymentMethod: 'card' | 'mobile_money' | 'bank_transfer' | 'ussd', paymentResponse: any, paymentContext: any) => {    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
  
      // Use context data instead of component state
      const { amount, shippingCost, shippingInfo, items } = paymentContext;
  
      // Calculate totals
      const subtotal = amount - (shippingCost || 0);
      const tax_amount = subtotal * 0.16;
  
      // Generate unique order number
      const generateOrderNumber = () => {
        const ts = new Date();
        const y = ts.getFullYear();
        const m = String(ts.getMonth() + 1).padStart(2, '0');
        const d = String(ts.getDate()).padStart(2, '0');
        const seq = Math.floor(Math.random() * 900000 + 100000);
        return `Order-${y}${m}${d}-${seq}`;
      };
  
      const orderNumber = generateOrderNumber();
  
      // Prepare order data
      const orderData = {
        user_id: user.id,
        status: 'pending',
        payment_status: 'paid', // Mark as paid since PayStack confirmed success
        payment_method: paymentMethod,
        total_amount: amount,
        shipping_cost: shippingCost || 0,
        tax_amount,
        subtotal,
        order_number: orderNumber,
        shipping_type: shippingInfo.shippingType || 'standard',
        shipping_info: shippingInfo,
        payment_details: {
          reference: paymentResponse.reference || paymentResponse.trxref,
          channel: paymentResponse.channel,
          transaction_data: paymentResponse,
          processed_at: new Date().toISOString(),
          provider: 'paystack'
        },
        notes: null
      };
  
      console.log('[UnifiedPayment] Creating order after payment:', orderData);
  
      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();
  
      if (orderError) {
        console.error('[UnifiedPayment] Order creation error:', orderError);
        throw new Error(`Failed to create order: ${orderError.message}`);
      }
  
      // Create order items
      const orderItems = items.map((item: CartItem) => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price
      }));
  
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
  
      if (itemsError) {
        console.error('[UnifiedPayment] Order items creation error:', itemsError);
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }
  
      return order;
    } catch (error) {
      console.error('[UnifiedPayment] Error creating order after payment:', error);
      throw error;
    }
  };

  const paymentMethods = [
    {
      id: 'mpesa',
      name: 'M-Pesa',
      icon: <Smartphone className="w-6 h-6" />,
      description: 'Pay with M-Pesa',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      borderColor: 'border-green-500/20'
    },
    {
      id: 'mpesa_till',
      name: 'M-Pesa Till',
      icon: <Building2 className="w-6 h-6" />,
      description: 'Pay to M-Pesa Till Number',
      color: 'text-green-600',
      bgColor: 'bg-green-600/10',
      borderColor: 'border-green-600/20'
    },
    {
      id: 'airtel_money',
      name: 'Airtel Money',
      icon: <Banknote className="w-6 h-6" />,
      description: 'Pay with Airtel Money',
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/20'
    },
    {
      id: 'card',
      name: 'Card',
      icon: <CreditCard className="w-6 h-6" />,
      description: 'Visa, Mastercard, Verve',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/20'
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

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2 text-sm text-blue-800">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Secure Payment Process</p>
            <p className="mt-1">A secure payment window will open. If blocked, please allow pop-ups for this site.</p>
          </div>
        </div>
      </div>

      {/* PayStack Pay Button */}
      {/* <button
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
      </button> */}

      <button
        onClick={handlePayClick}
        disabled={disabled || isLoading}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Opening Secure Payment...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4" />
            Pay Securely with PayStack
          </>
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
              <strong>
                <a 
                  style={{display: 'block', color: '#fafafa', textDecoration: 'none', fontSize: '0.9em'}} 
                  href="https://paystack.com/security" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  🔒 Secured by PayStack Payments
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