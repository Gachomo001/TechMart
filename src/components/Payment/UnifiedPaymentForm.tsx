import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  CreditCard,  Smartphone, Shield, Clock, Building2, Info, Banknote } from 'lucide-react';import { useCart } from '../../contexts/CartContext';
import { supabase } from '../../lib/supabase';
import OrderConfirmationModal from '../OrderConfirmationModal';
import { CartItem } from '../../types/index';
import { useFooterLinks } from '../../hooks/useFooterLinks';
import { generateReceiptPDF } from '../../utils/receiptGenerator';

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
  // const [paymentTimeout, setPaymentTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showOrderConfirmationModal, setShowOrderConfirmationModal] = useState(false);
  // Add this line after your other variable declarations (around line 40-50)
  const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || import.meta.env.PAYSTACK_PUBLIC_KEY;
  // Update this type definition in your component or types file:
  const [orderData, setOrderData] = useState<{
    orderNumber: string;
    orderNumberDisplay: string;
    paymentMethod: 'card' | 'mobile_money' | 'bank_transfer' | 'ussd' | 'whatsapp';
    paymentDetails?: any;
  } | null>(null);
  const {clearCart, state } = useCart();
  const items = state.items;
  const { socialMediaLinks, loading: footerLoading } = useFooterLinks();
  const [isWhatsAppLoading, setIsWhatsAppLoading] = useState(false);

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

  // Create order for WhatsApp payment
  const createWhatsAppOrder = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

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

      // Prepare order data for WhatsApp payment
      const orderData = {
        user_id: user.id,
        status: 'pending',
        payment_status: 'pending', // Pending until manually confirmed
        payment_method: 'whatsapp',
        total_amount: amount,
        shipping_cost: shippingCost || 0,
        tax_amount,
        subtotal,
        order_number: orderNumber,
        shipping_type: shippingInfo?.shippingType || 'standard',
        shipping_info: shippingInfo || {}, // Provide fallback empty object
        payment_details: {
          whatsapp_number: socialMediaLinks.whatsapp,
          processed_at: new Date().toISOString(),
          provider: 'whatsapp'
        },
        notes: 'Payment via WhatsApp - Pending confirmation'
      };

      console.log('[WhatsApp Payment] Creating order:', orderData);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) {
        console.error('[WhatsApp Payment] Order creation error:', orderError);
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
        console.error('[WhatsApp Payment] Order items creation error:', itemsError);
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(`Failed to create order items: ${itemsError.message}`);
      }

      return order;
    } catch (error) {
      console.error('[WhatsApp Payment] Error creating order:', error);
      throw error;
    }
  };

  // Handle WhatsApp payment
  const handleWhatsAppPayment = async () => {
    if (!socialMediaLinks.whatsapp) {
      toast.error('WhatsApp payment is not available');
      return;
    }
  
    try {
      setIsWhatsAppLoading(true);
  
      // Create the order
      const order = await createWhatsAppOrder();
  
      // Fetch location names from UUIDs with better error handling
      let countyName = shippingInfo?.county || '';
      let regionName = shippingInfo?.region || '';
  
      console.log('Original location IDs:', { county: countyName, region: regionName });
  
      try {
        if (shippingInfo?.county && shippingInfo.county.length > 10) { // Check if it's a UUID
          console.log('Fetching county name for ID:', shippingInfo.county);
          const { data: countyData, error: countyError } = await supabase
            .from('locations')
            .select('name')
            .eq('id', shippingInfo.county)
            .single();
          
          console.log('County fetch result:', { countyData, countyError });
          if (countyData && !countyError) {
            countyName = countyData.name;
          }
        }
  
        if (shippingInfo?.region && shippingInfo.region.length > 10) { // Check if it's a UUID
          console.log('Fetching region name for ID:', shippingInfo.region);
          const { data: regionData, error: regionError } = await supabase
            .from('locations')
            .select('name')
            .eq('id', shippingInfo.region)
            .single();
          
          console.log('Region fetch result:', { regionData, regionError });
          if (regionData && !regionError) {
            regionName = regionData.name;
          }
        }
      } catch (error) {
        console.error('Error fetching location names:', error);
      }
  
      console.log('Final location names:', { countyName, regionName });
  
      // NOW generate PDF with payment instructions (after location names are resolved)
      const receiptData = {
        order_number: order.order_number,
        items: items.map(item => ({
          product: {
            name: item.product.name,
            price: item.product.price,
            image_url: item.product.image_url || '/placeholder-image.jpg'  // Handle null case
          },
          quantity: item.quantity,
          price_at_time: item.product.price
        })),
        shipping_info: {
          firstName,
          lastName,
          county: countyName || shippingInfo?.county || '',     // Use resolved name, fallback to UUID
          region: regionName || shippingInfo?.region || '',     // Use resolved name, fallback to UUID
          country: shippingInfo?.country || 'Kenya',
          email,
          phone
        },
        subtotal: order.subtotal,
        tax_amount: order.tax_amount,
        shipping_cost: order.shipping_cost,
        total_amount: order.total_amount,
        payment_method: 'whatsapp' as const,
        payment_details: null,
        shipping_type: shippingInfo?.shippingType,
        include_payment_instructions: true
      };

      const doc = await generateReceiptPDF(receiptData);
      const pdfBlob = doc.output('blob');

      console.log('PDF Blob created:', pdfBlob.size, 'bytes');

      // Store PDF in Supabase Storage and get public URL
      let pdfDownloadLink = '';
      try {
        const fileName = `order-${order.order_number}.pdf`; // Simplified path
        console.log('Attempting to upload PDF with filename:', fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(fileName, pdfBlob, {
            contentType: 'application/pdf',
            upsert: true
          });

        console.log('Upload result:', { uploadData, uploadError });

        if (uploadError) {
          console.error('Error uploading PDF:', uploadError);
        } else {
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('receipts')
            .getPublicUrl(fileName);
          pdfDownloadLink = publicUrl;
          console.log('PDF uploaded successfully:', publicUrl);
        }
      } catch (error) {
        console.error('Error handling PDF upload:', error);
      }

      console.log('Original location IDs:', { county: countyName, region: regionName });

      try {
        if (shippingInfo?.county && shippingInfo.county.length > 10) { // Check if it's a UUID
          console.log('Fetching county name for ID:', shippingInfo.county);
          const { data: countyData, error: countyError } = await supabase
            .from('locations')
            .select('name')
            .eq('id', shippingInfo.county)
            .single();
          
          console.log('County fetch result:', { countyData, countyError });
          if (countyData && !countyError) {
            countyName = countyData.name;
          }
        }

        if (shippingInfo?.region && shippingInfo.region.length > 10) { // Check if it's a UUID
          console.log('Fetching region name for ID:', shippingInfo.region);
          const { data: regionData, error: regionError } = await supabase
            .from('locations')
            .select('name')
            .eq('id', shippingInfo.region)
            .single();
          
          console.log('Region fetch result:', { regionData, regionError });
          if (regionData && !regionError) {
            regionName = regionData.name;
          }
        }
      } catch (error) {
        console.error('Error fetching location names:', error);
      }

      console.log('Final location names:', { countyName, regionName });
      console.log('PDF download link:', pdfDownloadLink);

      // Create WhatsApp message with proper location names and PDF link
      const orderSummary = items.map(item => {
        // Truncate product name at first dash (– or -) OR pipe (|) to shorten the message
        const shortName = item.product.name.split(/[–\-|]/)[0].trim();
        return `• ${shortName} (Qty: ${item.quantity}) - KES ${(item.product.price * item.quantity).toLocaleString()}`;
      }).join('\n');

      const deliveryAddress = `${firstName} ${lastName}\n${countyName}${regionName ? `, ${regionName}` : ''}\n${phone}`;

      // Determine if it's shop collection
      const isShopCollection = shippingInfo?.shippingType === 'collect';

      // Format delivery fee
      const deliveryFeeText = order.shipping_cost === 0 ? 'FREE' : `KES ${order.shipping_cost.toLocaleString()}`;

      const customFileName = `${order.order_number}.pdf`;
      const whatsappMessage = encodeURIComponent(
        `Hello! I would like to place this order:\n\n` +
        `*ORDER*: *${order.order_number}*\n\n` +
        `*ITEMS*:\n${orderSummary}\n\n` +
        (!isShopCollection ? `*Delivery Fee*: ${deliveryFeeText}\n` : '') +
        `*TOTAL*: *KES ${order.total_amount.toLocaleString()}*\n\n` +
        (!isShopCollection ? `*DELIVERY ADDRESS*:\n${deliveryAddress}\n\n` : '') +
        (pdfDownloadLink ? `*RECEIPT*: *${customFileName}*\n${pdfDownloadLink}\n\n` : '') +
        `Please confirm this order and provide payment instructions. Thank you!`
      );

      console.log('Final WhatsApp message:', decodeURIComponent(whatsappMessage));
      // Store PDF in receipts table for business reference
      const pdfData = pdfBlob;
      await supabase
        .from('receipts')
        .insert([{
          order_id: order.id,
          pdf_data: pdfData,
          created_at: new Date().toISOString()
        }]);

      // Clear cart
      clearCart();

      // Set order data for confirmation modal
      setOrderData({
        orderNumber: order.order_number,
        orderNumberDisplay: order.order_number,
        paymentMethod: 'whatsapp' as any,
        paymentDetails: { whatsappNumber: socialMediaLinks.whatsapp }
      });

      // Open WhatsApp
      const whatsappUrl = `${socialMediaLinks.whatsapp}?text=${whatsappMessage}`;
      window.open(whatsappUrl, '_blank');

      // Show success and redirect
      toast.success('Order created! Redirecting to WhatsApp...');
      
      // Show order confirmation modal
      setShowOrderConfirmationModal(true);

      // Call onPaymentComplete if provided
      if (onPaymentComplete) {
        onPaymentComplete({
          reference: order.order_number,
          status: 'success',
          trans: order.order_number,
          transaction: order.order_number,
          trxref: order.order_number,
          redirecturl: ''
        });
      }

    } catch (error) {
      console.error('[WhatsApp Payment] Error:', error);
      toast.error('Failed to create WhatsApp order. Please try again.');
    } finally {
      setIsWhatsAppLoading(false);
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
      <div className="mt-6 p-6 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <div className="flex items-center space-x-2 text-blue-400">
          <Info className="w-5 h-5" />
          <span className="text-base font-medium">Payment Information</span>
        </div>
        <ul className="text-sm text-blue-400/80 mt-3 space-y-2 list-disc list-inside">
          <li>A secure payment window will open in a few seconds. If blocked, please allow pop-ups for this site.</li>
          <li>When using Mobile Money(M-Pesa & Airtel Money) ensure to input your phone number in the format '070 000 0000'. Include the spaces.</li>
        </ul>
      </div>

      {/* Payment Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* PayStack Button */}
        <button
          type="button"
          onClick={handlePayClick}
          className={`flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:scale-[1.02] ${
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
              <span>Pay Securely via PayStack</span>
            </div>
          )}
        </button>

        {/* WhatsApp Button */}
        <button
          type="button"
          onClick={handleWhatsAppPayment}
          className={`flex-1 px-6 py-4 font-semibold rounded-lg shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all transform ${
            !socialMediaLinks.whatsapp || footerLoading || isWhatsAppLoading
              ? 'bg-gray-400 text-gray-600 cursor-not-allowed opacity-50 transform-none'
              : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white hover:scale-[1.02] focus:ring-green-500'
          }`}
          disabled={!socialMediaLinks.whatsapp || footerLoading || isWhatsAppLoading}
        >
          {isWhatsAppLoading ? (
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Creating Order...</span>
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.785"/>
              </svg>
              <span>Pay via WhatsApp</span>
            </div>
          )}
        </button>
      </div>

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