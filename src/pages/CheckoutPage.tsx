import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CreditCard, Shield, Check, Smartphone, Download } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import BackButton from '../components/BackButton';
import CustomDropdown from '../components/CustomDropdown';
import jsPDF from 'jspdf';
import { UserOptions } from 'jspdf-autotable';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import pesapalService from '../lib/pesapal';
import toast from 'react-hot-toast';

// Add type augmentation for jsPDF
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
    autoTable: (options: UserOptions) => jsPDF;
  }
}

interface ShippingInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  county: string;
  region: string;
  country: string;
  shippingType: string;
}

interface PaymentInfo {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  nameOnCard: string;
  billingAddress: string;
  billingCity: string;
  billingState: string;
  billingZipCode: string;
  sameAsShipping: boolean;
}

interface MpesaInfo {
  phoneNumber: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, getTotalPrice, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mpesa'>('mpesa');
  const [mpesaPromptSent, setMpesaPromptSent] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [orderTotals, setOrderTotals] = useState({
    subtotal: 0,
    tax: 0,
    shippingCost: 0,
    total: 0
  });
  
  // Ref for the order confirmed modal
  const orderConfirmedModalRef = useRef<HTMLDivElement>(null);

  // Store the previous path
  const [previousPath, setPreviousPath] = useState('/');

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    county: '',
    region: '',
    country: 'Kenya',
    shippingType: ''
  });

  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: '',
    billingAddress: '',
    billingCity: '',
    billingState: '',
    billingZipCode: '',
    sameAsShipping: true
  });

  const [mpesaInfo, setMpesaInfo] = useState<MpesaInfo>({
    phoneNumber: ''
  });

  const { user } = useAuth();

  // State for storing locations
  const [counties, setCounties] = useState<{ value: string; label: string }[]>([]);
  const [regions, setRegions] = useState<{ value: string; label: string }[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  // Add after other useState declarations
  const [selectedRegionDetails, setSelectedRegionDetails] = useState<{
    delivery_status: 'paid' | 'free' | null;
    delivery_costs: {
      standard_delivery_cost: number;
      express_delivery_cost: number;
      heavy_items_cost: number;
      bulky_items_cost: number;
    } | null;
  } | null>(null);

  // Add these derived variables after counties/regions state
  const selectedCountyName = counties.find(c => c.value === shippingInfo.county)?.label || shippingInfo.county;
  const selectedRegionName = regions.find(r => r.value === shippingInfo.region)?.label || shippingInfo.region;

  // Fetch counties from the database
  useEffect(() => {
    const fetchCounties = async () => {
      try {
        setIsLoadingLocations(true);
        const { data, error } = await supabase
          .from('locations')
          .select('id, name')
          .eq('type', 'county')
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        const formattedCounties = data.map(county => ({
          value: county.id,
          label: county.name
        }));

        setCounties(formattedCounties);
      } catch (error) {
        console.error('Error fetching counties:', error);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchCounties();
  }, []);

  // Fetch regions when county changes
  useEffect(() => {
    const fetchRegions = async () => {
      if (!shippingInfo.county) {
        setRegions([]);
        return;
      }

      try {
        setIsLoadingLocations(true);
        const { data, error } = await supabase
          .from('locations')
          .select('id, name')
          .eq('type', 'region')
          .eq('parent_id', shippingInfo.county)
          .eq('is_active', true)
          .order('name');

        if (error) throw error;

        const formattedRegions = data.map(region => ({
          value: region.id,
          label: region.name
        }));

        setRegions(formattedRegions);
      } catch (error) {
        console.error('Error fetching regions:', error);
      } finally {
        setIsLoadingLocations(false);
      }
    };

    fetchRegions();
  }, [shippingInfo.county]);

  // Fetch region delivery_status and delivery_costs when region changes
  useEffect(() => {
    const fetchRegionDetails = async () => {
      if (!shippingInfo.region) {
        setSelectedRegionDetails(null);
        return;
      }
      const { data, error } = await supabase
        .from('locations')
        .select(`
          delivery_status,
          delivery_costs(
            standard_delivery_cost,
            express_delivery_cost,
            heavy_items_cost,
            bulky_items_cost
          )
        `)
        .eq('id', shippingInfo.region)
        .single();

      if (error) {
        setSelectedRegionDetails(null);
        return;
      }
      setSelectedRegionDetails({
        delivery_status: data.delivery_status,
        delivery_costs: Array.isArray(data.delivery_costs) ? data.delivery_costs[0] : data.delivery_costs
      });
    };
    fetchRegionDetails();
  }, [shippingInfo.region]);

  // Dynamic shipping options based on selected region's delivery_costs
  const shippingOptions = selectedRegionDetails?.delivery_costs
    ? [
        {
          id: 'standard',
          name: 'Standard Delivery',
          description: 'For items under 5kg (electronics, clothing, small accessories)',
          price: selectedRegionDetails.delivery_costs.standard_delivery_cost,
          duration: '5-7 business days'
        },
        {
          id: 'express',
          name: 'Express Delivery',
          description: 'For items 5-15kg (medium electronics, small appliances)',
          price: selectedRegionDetails.delivery_costs.express_delivery_cost,
          duration: '2-3 business days'
        },
        {
          id: 'heavy',
          name: 'Heavy Items Delivery',
          description: 'For items 15-30kg (large appliances, furniture)',
          price: selectedRegionDetails.delivery_costs.heavy_items_cost,
          duration: '3-4 business days'
        },
        {
          id: 'bulky',
          name: 'Bulky Items Delivery',
          description: 'For items over 30kg (large furniture, multiple items)',
          price: selectedRegionDetails.delivery_costs.bulky_items_cost,
          duration: '4-5 business days'
        }
      ]
    : [];

  // Reset region when county changes
  useEffect(() => {
    setShippingInfo(prev => ({ ...prev, region: '' }));
  }, [shippingInfo.county]);

  // Get the previous path when component mounts
  useEffect(() => {
    if (location.state?.from) {
      setPreviousPath(location.state.from);
    }
  }, [location.state]);

  // Redirect if cart is empty
  useEffect(() => {
    if (state.items.length === 0 && !orderComplete) {
      navigate('/');
    }
  }, [state.items.length, orderComplete, navigate]);

  // Update shipping cost calculation
  const getShippingCost = () => {
    const selectedOption = shippingOptions.find(opt => opt.id === shippingInfo.shippingType);
    return selectedOption?.price || 0;
  };

  // Add logging for initial calculations
  const subtotal = getTotalPrice();
  const tax = subtotal * 0.16; // 16% VAT (already included in product prices)
  const shippingCost = getShippingCost();
  const total = subtotal + shippingCost; // Total without adding VAT since it's already included
  
  console.log('[Debug] Initial calculations:', {
    subtotal,
    tax,
    shippingCost,
    total,
    rawSubtotal: getTotalPrice()
  });

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentStep(2);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isShippingInfoValid()) return;
    
    setIsProcessing(true);
    try {
      const newOrderNumber = generateOrderNumber();
      
      // Prepare order data
      const orderData = {
        order_number: newOrderNumber,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'card',
        payment_details: {
          cardLast4: paymentInfo.cardNumber.slice(-4),
          cardHolder: paymentInfo.nameOnCard
        },
        total_amount: total,
        shipping_cost: shippingCost,
        tax_amount: tax,
        subtotal: subtotal,
        shipping_type: shippingInfo.shippingType,
        shipping_info: {
          ...shippingInfo,
          countyName: selectedCountyName,
          regionName: selectedRegionName
        },
        email: shippingInfo.email,
        phone: shippingInfo.phone,
        user_id: user?.id
      };

      // Insert order first
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = state.items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Initiate Pesapal card payment
      const paymentResponse = await pesapalService.initiateCardPayment({
        amount: total,
        orderNumber: newOrderNumber,
        customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
        customerEmail: shippingInfo.email,
        customerPhone: shippingInfo.phone,
        description: `Payment for TechMart order ${newOrderNumber}`,
        cardNumber: paymentInfo.cardNumber,
        expiryMonth: paymentInfo.expiryDate.split('/')[0],
        expiryYear: `20${paymentInfo.expiryDate.split('/')[1]}`,
        cvv: paymentInfo.cvv,
        cardHolderName: paymentInfo.nameOnCard
      });

      if (paymentResponse.success && paymentResponse.checkoutUrl) {
        // Redirect to Pesapal checkout
        window.location.href = paymentResponse.checkoutUrl;
      } else {
        throw new Error(paymentResponse.message || 'Failed to initiate payment');
      }

    } catch (error: any) {
      console.error('Error processing card payment:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMpesaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isShippingInfoValid()) return;
    
    setIsProcessing(true);
    try {
      const newOrderNumber = generateOrderNumber();
      
      // Prepare order data
      const orderData = {
        order_number: newOrderNumber,
        status: 'pending',
        payment_status: 'pending',
        payment_method: 'mpesa',
        payment_details: {
          phoneNumber: mpesaInfo.phoneNumber
        },
        total_amount: total,
        shipping_cost: shippingCost,
        tax_amount: tax,
        subtotal: subtotal,
        shipping_type: shippingInfo.shippingType,
        shipping_info: {
          ...shippingInfo,
          countyName: selectedCountyName,
          regionName: selectedRegionName
        },
        email: shippingInfo.email,
        phone: shippingInfo.phone,
        user_id: user?.id
      };

      // Insert order first
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert order items
      const orderItems = state.items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        price_at_time: item.product.price
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Initiate Pesapal M-Pesa payment
      const paymentResponse = await pesapalService.initiateMpesaPayment({
        amount: total,
        phoneNumber: mpesaInfo.phoneNumber,
        orderNumber: newOrderNumber,
        customerName: `${shippingInfo.firstName} ${shippingInfo.lastName}`,
        customerEmail: shippingInfo.email,
        customerPhone: shippingInfo.phone,
        description: `Payment for TechMart order ${newOrderNumber}`
      });

      if (paymentResponse.success && paymentResponse.checkoutUrl) {
        // Redirect to Pesapal checkout
        window.location.href = paymentResponse.checkoutUrl;
      } else {
        throw new Error(paymentResponse.message || 'Failed to initiate payment');
      }

    } catch (error: any) {
      console.error('Error processing M-Pesa payment:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinueShopping = () => {
    navigate('/');
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove any non-digit characters except the + prefix
    const v = value.replace(/[^\d+]/g, '');
    
    // If the input starts with +254, remove it for processing
    const cleanNumber = v.startsWith('+254') ? v.slice(4) : v;
    
    // Format the number with +254 prefix
    if (cleanNumber.length <= 3) return `+254${cleanNumber}`;
    if (cleanNumber.length <= 6) return `+254${cleanNumber.slice(0, 3)}-${cleanNumber.slice(3)}`;
    if (cleanNumber.length <= 9) return `+254${cleanNumber.slice(0, 3)}-${cleanNumber.slice(3, 6)}-${cleanNumber.slice(6)}`;
    return `+254${cleanNumber.slice(0, 3)}-${cleanNumber.slice(3, 6)}-${cleanNumber.slice(6, 9)}`;
  };

  const handleBackToStore = () => {
    navigate(previousPath);
  };

  const isShippingInfoValid = () => {
    const isBaseValid =
      shippingInfo.firstName.trim() !== '' &&
      shippingInfo.lastName.trim() !== '' &&
      shippingInfo.phone.trim() !== '' &&
      shippingInfo.county.trim() !== '' &&
      shippingInfo.region.trim() !== '';

    if (selectedRegionDetails?.delivery_status === 'free') {
      return isBaseValid;
    }
    // For paid, require shippingType
    return isBaseValid && shippingInfo.shippingType.trim() !== '';
  };

  const handleStepClick = (step: number) => {
    if (step === 2 && !isShippingInfoValid()) {
      return; // Don't allow navigation to payment if shipping info is incomplete
    }
    if (step < currentStep) {
      setCurrentStep(step);
    }
  };

  const handleDownloadReceipt = async () => {
    console.log('[Debug] Download Receipt button clicked');
    console.log('[Debug] Current values:', orderTotals);
    
    try {
      const orderData = {
        order_number: orderNumber,
        payment_method: paymentMethod,
        shipping_info: {
          ...shippingInfo,
          countyName: selectedCountyName,
          regionName: selectedRegionName
        },
        items: orderItems,
        subtotal: orderTotals.subtotal,
        shipping_cost: orderTotals.shippingCost,
        tax_amount: orderTotals.tax,
        total_amount: orderTotals.total,
        shipping_type: shippingInfo.shippingType
      };
      console.log('[Debug] Order data for PDF:', orderData);
      
      const doc = await generateReceiptPDF(orderData);
      console.log('[Debug] PDF generated, attempting to save');
      
      // Save the PDF
      doc.save(`TechMart_Receipt_${orderNumber}.pdf`);
      console.log('[Debug] PDF saved successfully');
    } catch (error) {
      console.error('[Debug] Error in handleDownloadReceipt:', error);
      alert('Failed to download receipt. Please try again.');
    }
  };

  const generateReceiptPDF = async (orderData: any) => {
    console.log('[Debug] Starting PDF generation with order data:', {
      orderNumber: orderData.order_number,
      subtotal: orderData.subtotal,
      tax: orderData.tax_amount,
      shipping: orderData.shipping_cost,
      total: orderData.total_amount,
      items: orderData.items?.length
    });
    
    if (!orderData || !orderData.items) {
      console.error('[Debug] Invalid order data:', orderData);
      throw new Error('Invalid order data: items are missing');
    }
    
    try {
      // Create new jsPDF instance with larger page size for better quality
      const doc = new jsPDF({
        unit: 'px',
        format: [595.28, 841.89], // A4 size in pixels
        orientation: 'portrait'
      });

      // Set default font
      doc.setFont('helvetica');
      
      // Add card-like background and border
      const margin = 40;
      const cardWidth = 595.28 - (margin * 2);
      const cardHeight = 841.89 - (margin * 2);
      const cornerRadius = 12; // Radius for rounded corners
      
      // Add white background
      doc.setFillColor(255, 255, 255);
      doc.rect(margin, margin, cardWidth, cardHeight, 'F');
      
      // Draw rounded corners (simulated with multiple lines)
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(2); // Make the border bolder
      
      // Draw the main rectangle
      doc.rect(margin, margin, cardWidth, cardHeight);
      
      // Draw rounded corners by drawing multiple lines
      // Top-left corner
      doc.line(margin + cornerRadius, margin, margin, margin);
      doc.line(margin, margin, margin, margin + cornerRadius);
      
      // Top-right corner
      doc.line(cardWidth + margin - cornerRadius, margin, cardWidth + margin, margin);
      doc.line(cardWidth + margin, margin, cardWidth + margin, margin + cornerRadius);
      
      // Bottom-left corner
      doc.line(margin + cornerRadius, cardHeight + margin, margin, cardHeight + margin);
      doc.line(margin, cardHeight + margin, margin, cardHeight + margin - cornerRadius);
      
      // Bottom-right corner
      doc.line(cardWidth + margin - cornerRadius, cardHeight + margin, cardWidth + margin, cardHeight + margin);
      doc.line(cardWidth + margin, cardHeight + margin, cardWidth + margin, cardHeight + margin - cornerRadius);

      // Add TechMart title with gradient effect (simulated with blue color)
      doc.setFontSize(38);
      doc.setTextColor(59, 130, 246);
      doc.setFont('helvetica', 'bold');
      doc.text('TechMart', 297.64, margin + 40, { align: 'center' });
      
      // Add "Order Receipt" subtitle
      doc.setFontSize(16);
      doc.setTextColor(100, 116, 139);
      doc.setFont('helvetica', 'normal');
      doc.text('Order Receipt', 297.64, margin + 60, { align: 'center' });

      // Add order details section
      let currentY = margin + 100;
      
      // Order details grid
      doc.setFontSize(14);
      doc.setTextColor(71, 85, 105); // slate-600
      
      // Left column
      doc.text('Order Number:', margin + 20, currentY);
      doc.setFontSize(16);
      doc.setTextColor(37, 99, 235); // blue-600
      doc.setFont('helvetica', 'bold');
      doc.text(`#${orderData.order_number}`, margin + 20, currentY + 20);
      
      // Right column
      doc.setFontSize(14);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.setFont('helvetica', 'normal');
      doc.text('Order Date:', cardWidth + margin - 20, currentY, { align: 'right' });
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.text(new Date().toLocaleDateString(), cardWidth + margin - 20, currentY + 20, { align: 'right' });
      
      currentY += 40;
      
      // Payment Method and Status
      doc.setFontSize(14);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.setFont('helvetica', 'normal');
      doc.text('Payment Method:', margin + 20, currentY);
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      
      // Format payment method text with proper M-Pesa number display
      const paymentMethodText = orderData.payment_method === 'card' 
        ? `Card ending in ${orderData.payment_details?.cardLast4 || '****'}` 
        : `M-Pesa (${orderData.payment_details?.phoneNumber || mpesaInfo?.phoneNumber || ''})`;
      
      doc.text(paymentMethodText, margin + 20, currentY + 20);
      
      // Status
      doc.setFontSize(14);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.setFont('helvetica', 'normal');
      doc.text('Status:', cardWidth + margin - 20, currentY, { align: 'right' });
      doc.setFontSize(16);
      doc.setTextColor(22, 163, 74); // green-600
      doc.setFont('helvetica', 'bold');
      doc.text('Confirmed', cardWidth + margin - 20, currentY + 20, { align: 'right' });

      // Add more space before the separator line
      currentY += 50;
      
      // Add separator line before Items Ordered section
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(1);
      doc.line(margin + 20, currentY, cardWidth + margin - 20, currentY);
      currentY += 30;

      // Add items section
      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.text('Items Ordered', margin + 20, currentY);
      currentY += 30;

      // Process each item
      for (const item of orderData.items) {
        if (currentY > 700) { // Check if we need a new page
          doc.addPage();
          currentY = margin + 40;
        }

        try {
          // Load and add product image
          const img = new Image();
          img.src = item.product.image;
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
          });

          // Add image (48x48 pixels)
          doc.addImage(img, 'JPEG', margin + 20, currentY, 48, 48, undefined, 'FAST');
          
          // Add product details
          doc.setFontSize(16);
          doc.setTextColor(15, 23, 42); // slate-900
          doc.setFont('helvetica', 'bold');
          doc.text(item.product.name, margin + 80, currentY + 20);
          
          doc.setFontSize(14);
          doc.setTextColor(71, 85, 105); // slate-600
          doc.setFont('helvetica', 'normal');
          doc.text(`Qty: ${item.quantity} × KES ${item.product.price.toLocaleString()}`, margin + 80, currentY + 40);
          
          // Add total price
          doc.setFontSize(18);
          doc.setTextColor(15, 23, 42); // slate-900
          doc.setFont('helvetica', 'bold');
          doc.text(
            `KES ${(item.product.price * item.quantity).toLocaleString()}`,
            cardWidth + margin - 20,
            currentY + 30,
            { align: 'right' }
          );

          currentY += 80; // Add spacing between items
        } catch (error) {
          console.error('[Debug] Error processing item image:', error);
          currentY += 80;
        }
      }

      // Add totals section (without background)
      currentY += 20;
      doc.setFontSize(14);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.setFont('helvetica', 'normal');
      let y = currentY;

      // Subtotal
      doc.text('Subtotal (incl. VAT):', margin + 20, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`KES ${orderData.subtotal.toLocaleString()}`, cardWidth + margin - 20, y, { align: 'right' });
      y += 25;

      // VAT
      doc.setFont('helvetica', 'normal');
      doc.text('VAT (16%):', margin + 20, y);
      doc.setFont('helvetica', 'bold');
      doc.text(`KES ${orderData.tax_amount.toLocaleString()}`, cardWidth + margin - 20, y, { align: 'right' });
      y += 25;

      // Shipping
      doc.setFont('helvetica', 'normal');
      doc.text(`Shipping (${orderData.shipping_type}):`, margin + 20, y);
      doc.setFont('helvetica', 'bold');
      doc.text(
        orderData.shipping_cost === 0 
          ? 'FREE' 
          : `KES ${orderData.shipping_cost.toLocaleString()}`,
        cardWidth + margin - 20,
        y,
        { align: 'right' }
      );
      y += 40;

      // Total Amount
      doc.setFontSize(20);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.text('Total Amount:', margin + 20, y);
      doc.setTextColor(22, 163, 74); // green-600
      doc.text(`KES ${orderData.total_amount.toLocaleString()}`, cardWidth + margin - 20, y, { align: 'right' });

      // Add shipping information
      currentY = y + 30; // Adjust spacing after totals section
      if (currentY > 700) {
        doc.addPage();
        currentY = margin + 40;
      }

      // Add a separator line after totals
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(1);
      doc.line(margin + 20, currentY, cardWidth + margin - 20, currentY);
      currentY += 30;

      doc.setFontSize(18);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.setFont('helvetica', 'bold');
      doc.text('Shipping Information', margin + 20, currentY);
      currentY += 30;

      doc.setFontSize(14);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.setFont('helvetica', 'normal');
      doc.setFont('helvetica', 'bold');
      doc.text(`${orderData.shipping_info.firstName} ${orderData.shipping_info.lastName}`, margin + 20, currentY);
      currentY += 20;
      doc.setFont('helvetica', 'normal');
      doc.text(`${orderData.shipping_info.countyName || orderData.shipping_info.county}, ${orderData.shipping_info.regionName || orderData.shipping_info.region}`, margin + 20, currentY);
      currentY += 20;
      doc.text(orderData.shipping_info.country, margin + 20, currentY);
      currentY += 20;
      if (orderData.shipping_info.email) {
        doc.setTextColor(37, 99, 235); // blue-600
        doc.text(orderData.shipping_info.email, margin + 20, currentY);
        currentY += 20;
      }
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(orderData.shipping_info.phone, margin + 20, currentY);

      console.log('[Debug] PDF generation completed');
      return doc;
    } catch (error) {
      console.error('[Debug] Error generating PDF:', error);
      throw error;
    }
  };

  const generateOrderNumber = () => {
    return `TM${Date.now().toString().slice(-6)}`;
  };

  if (orderComplete) {
    console.log('[Debug] Rendering order confirmation modal with values:', {
      ...orderTotals,
      orderItems: orderItems?.length
    });
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center py-12">
        <div className="absolute inset-0 bg-neutral-600" />
        <div ref={orderConfirmedModalRef} className="bg-white rounded-xl max-w-4xl w-full mx-4 overflow-hidden relative z-10">
          {/* Green Header Section */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-8 text-center text-white">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Order Confirmed!</h2>
            <p className="text-green-100">Thank you for your purchase</p>
          </div>

          {/* Scrollable Receipt Card */}
          <div className="p-6 bg-slate-50 max-h-[70vh] overflow-y-auto">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <div className="text-center mb-4">
                  <h3 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">TechMart</h3>
                  <p className="text-slate-600">Order Receipt</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Order Number:</span>
                    <p className="font-mono font-bold text-lg text-blue-600">#{orderNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-600">Order Date:</span>
                    <p className="font-semibold text-slate-900">{new Date().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-600">Payment Method:</span>
                    <p className="font-semibold text-slate-900 capitalize">
                      {paymentMethod === 'card' ? `Card ending in ${paymentInfo.cardNumber.slice(-4)}` : `M-Pesa (${mpesaInfo.phoneNumber})`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-600">Status:</span>
                    <p className="font-semibold text-green-600">Confirmed</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-b border-slate-200">
                <h4 className="font-bold mb-4 text-slate-900">Items Ordered</h4>
                <div className="space-y-4">
                  {orderItems && orderItems.length > 0 ? (
                    orderItems.map((item) => {
                      console.log('[Debug] Rendering item in modal:', item);
                      return (
                        <div key={item.product.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0">
                          <div className="flex items-center space-x-4">
                            <img 
                              src={item.product.image} 
                              alt={item.product.name}
                              className="w-12 h-12 object-cover rounded-lg"
                            />
                            <div>
                              <p className="font-semibold text-slate-900">{item.product.name}</p>
                              <p className="text-sm text-slate-600">Qty: {item.quantity} × KES {item.product.price.toLocaleString()}</p>
                            </div>
                          </div>
                          <p className="font-bold text-lg text-slate-900">KES {(item.product.price * item.quantity).toLocaleString()}</p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-slate-500 py-4">
                      No items found in order
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <div className="space-y-3">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal (incl. VAT):</span>
                    <span className="font-semibold text-slate-900">KES {orderTotals.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>VAT (16%):</span>
                    <span className="font-semibold text-slate-900">KES {orderTotals.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Shipping ({shippingInfo.shippingType}):</span>
                    <span className="font-semibold text-slate-900">{orderTotals.shippingCost === 0 ? 'FREE' : `KES ${orderTotals.shippingCost.toLocaleString()}`}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between text-xl font-bold">
                      <span className="text-slate-900">Total Amount:</span>
                      <span className="text-green-600">KES {orderTotals.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50">
                <h4 className="font-bold mb-3 text-slate-900">Shipping Information</h4>
                <div className="text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-900">{shippingInfo.firstName} {shippingInfo.lastName}</p>
                  <p>{selectedCountyName}, {selectedRegionName}</p>
                  <p>{shippingInfo.country}</p>
                  {shippingInfo.email && <p className="text-blue-600">{shippingInfo.email}</p>}
                  <p>{shippingInfo.phone}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                onClick={handleDownloadReceipt}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-[1.02]"
              >
                <Download className="w-5 h-5" />
                Download Receipt
              </button>
              
              <button
                onClick={handleContinueShopping}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-[1.02]"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="relative py-8 px-6 border-b border-slate-700">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
        <div className="relative flex flex-col items-center">
          <h1 className="text-2xl font-bold text-center mb-2">Checkout</h1>
          <div className="flex items-center justify-center space-x-8 mt-2">
            <button
              onClick={() => handleStepClick(1)}
              className={`flex items-center ${currentStep >= 1 ? 'text-blue-400' : 'text-slate-400'} transition-colors`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}>
                1
              </div>
              <span className="ml-2 font-medium">Shipping</span>
            </button>
            <div className={`w-16 h-0.5 ${currentStep >= 2 ? 'bg-blue-600' : 'bg-slate-700'}`} />
            <button
              onClick={() => handleStepClick(2)}
              className={`flex items-center ${currentStep >= 2 ? 'text-blue-400' : 'text-slate-400'} transition-colors`}
              disabled={!isShippingInfoValid()}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}>
                2
              </div>
              <span className="ml-2 font-medium">Payment</span>
            </button>
          </div>
        </div>
        <div className="absolute top-6 right-6 hidden md:block">
          <BackButton text="Back to Store" onClick={handleBackToStore} />
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {currentStep === 1 && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                <form onSubmit={handleShippingSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.firstName}
                        onChange={(e) => setShippingInfo({...shippingInfo, firstName: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={shippingInfo.lastName}
                        onChange={(e) => setShippingInfo({...shippingInfo, lastName: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={shippingInfo.email}
                        onChange={(e) => setShippingInfo({...shippingInfo, email: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Phone Number *
                      </label>
                      <input
                        type="tel"
                        required
                        value={shippingInfo.phone}
                        onChange={(e) => setShippingInfo({...shippingInfo, phone: e.target.value})}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        County *
                      </label>
                      <CustomDropdown
                        options={counties}
                        value={shippingInfo.county}
                        onChange={(value) => setShippingInfo({...shippingInfo, county: value})}
                        isLoading={isLoadingLocations}
                        placeholder={isLoadingLocations ? "Loading counties..." : "Select a county"}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        Region *
                      </label>
                      <CustomDropdown
                        options={regions}
                        value={shippingInfo.region}
                        onChange={(value) => setShippingInfo({...shippingInfo, region: value})}
                        isLoading={isLoadingLocations}
                        placeholder={isLoadingLocations ? "Loading regions..." : "Select a region"}
                        disabled={!shippingInfo.county || isLoadingLocations}
                        tooltipText={!shippingInfo.county ? "Please select a County first" : undefined}
                        required
                      />
                    </div>
                  </div>

                  {/* Shipping Costs Section - Only show after region is selected */}
                  {shippingInfo.region && selectedRegionDetails?.delivery_status === 'paid' && (
                    <div className="border-t border-slate-700/50 pt-6">
                      <h3 className="text-lg font-semibold mb-4">Shipping Costs</h3>
                      <div className="space-y-3">
                        {shippingOptions.map((option) => (
                          <label 
                            key={option.id}
                            className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                              shippingInfo.shippingType === option.id 
                                ? 'border-blue-500 bg-blue-500/10' 
                                : 'border-slate-700/50 hover:bg-slate-700/30'
                            }`}
                          >
                            <input
                              type="radio"
                              name="shippingType"
                              value={option.id}
                              checked={shippingInfo.shippingType === option.id}
                              onChange={(e) => setShippingInfo({...shippingInfo, shippingType: e.target.value})}
                              className="mt-1 text-blue-600"
                            />
                            <div className="ml-3 flex-1">
                              <div className="flex justify-between items-start">
                                <div>
                                  <span className="font-medium">{option.name}</span>
                                  <p className="text-sm text-slate-400 mt-1">{option.description}</p>
                                  <p className="text-xs text-slate-500 mt-1">Estimated delivery: {option.duration}</p>
                                </div>
                                <span className={`font-semibold ${option.price === 0 ? 'text-green-400' : ''}`}>
                                  {option.price === 0 ? 'FREE' : `KES ${option.price.toLocaleString()}`}
                                </span>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!isShippingInfoValid()}
                    className="w-full relative z-10 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed enabled:cursor-pointer"
                  >
                    Continue to Payment
                  </button>
                </form>
              </div>
            )}

            {currentStep === 2 && (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                {/* Payment Method Selection */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Choose Payment Method</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    {/* M-Pesa Option */}
                    <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors overflow-hidden ${
                      paymentMethod === 'mpesa' 
                        ? 'border-green-500' 
                        : 'border-slate-700 hover:border-slate-600'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-blue-600/20" />
                      <div className="relative z-10 flex items-center w-full">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="mpesa"
                          checked={paymentMethod === 'mpesa'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'mpesa')}
                          className="text-green-600"
                        />
                        <div className="ml-3 flex items-center gap-2">
                          <Smartphone className="w-5 h-5" />
                          <span className="font-medium">M-Pesa</span>
                        </div>
                      </div>
                    </label>

                    {/* Credit/Debit Card Option */}
                    <label className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-colors overflow-hidden ${
                      paymentMethod === 'card' 
                        ? 'border-blue-500' 
                        : 'border-slate-700 hover:border-slate-600'
                    }`}>
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20" />
                      <div className="relative z-10 flex items-center w-full">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="card"
                          checked={paymentMethod === 'card'}
                          onChange={(e) => setPaymentMethod(e.target.value as 'card' | 'mpesa')}
                          className="text-blue-600"
                        />
                        <div className="ml-3 flex items-center gap-2">
                          <CreditCard className="w-5 h-5" />
                          <span className="font-medium">Credit/Debit Card</span>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>

                {paymentMethod === 'card' && (
                  <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6">
                    <div className="flex items-center gap-2 text-blue-400 mb-4">
                      <CreditCard className="w-5 h-5" />
                      <span className="font-semibold">Card Details</span>
                    </div>
                    <form onSubmit={handlePaymentSubmit} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Card Number *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            placeholder="1234 5678 9012 3456"
                            value={paymentInfo.cardNumber}
                            onChange={(e) => setPaymentInfo({...paymentInfo, cardNumber: formatCardNumber(e.target.value)})}
                            maxLength={19}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                            <div className="w-8 h-5 bg-slate-600 rounded flex items-center justify-center">
                              <CreditCard className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Expiry Date *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="MM/YY"
                            value={paymentInfo.expiryDate}
                            onChange={(e) => setPaymentInfo({...paymentInfo, expiryDate: e.target.value})}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            CVV *
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              required
                              placeholder="123"
                              value={paymentInfo.cvv}
                              onChange={(e) => setPaymentInfo({...paymentInfo, cvv: e.target.value})}
                              maxLength={4}
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Shield className="w-4 h-4 text-slate-400" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Name on Card *
                        </label>
                        <input
                          type="text"
                          required
                          value={paymentInfo.nameOnCard}
                          onChange={(e) => setPaymentInfo({...paymentInfo, nameOnCard: e.target.value})}
                          className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-400"
                        />
                      </div>

                      <div className="flex items-center space-x-2 p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                        <input
                          type="checkbox"
                          id="sameAsShipping"
                          checked={paymentInfo.sameAsShipping}
                          onChange={(e) => setPaymentInfo({...paymentInfo, sameAsShipping: e.target.checked})}
                          className="rounded border-slate-600 text-blue-600 focus:ring-blue-500 bg-slate-700/50"
                        />
                        <label htmlFor="sameAsShipping" className="text-sm text-slate-300">
                          Billing address same as shipping address
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed enabled:cursor-pointer"
                      >
                        {isProcessing ? 'Processing...' : `Pay KES ${total.toLocaleString()}`}
                      </button>
                    </form>
                  </div>
                )}

                {paymentMethod === 'mpesa' && (
                  <div className="space-y-6">
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-400 mb-2">
                        <Smartphone className="w-5 h-5" />
                        <span className="font-semibold">M-Pesa Payment</span>
                      </div>
                      <p className="text-sm text-green-400/80">
                        You will receive an M-Pesa prompt on your phone to complete the payment.
                      </p>
                    </div>

                    <form onSubmit={handleMpesaSubmit} className="space-y-6">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          M-Pesa Phone Number *
                        </label>
                        <div className="flex group">
                          <div className="relative inline-flex items-center px-3 py-2 border border-slate-600 bg-slate-700/50 rounded-l-md w-24 group-focus-within:border-green-500 group-focus-within:ring-2 group-focus-within:ring-green-500/20">
                            <span className="text-slate-300 text-sm">🇰🇪 +254</span>
                          </div>
                          <input
                            type="tel"
                            required
                            pattern="[0-9]{3}-[0-9]{3}-[0-9]{3}"
                            inputMode="numeric"
                            placeholder="XXX-XXX-XXX"
                            value={mpesaInfo.phoneNumber.replace('+254', '')}
                            onChange={(e) => {
                              // Only allow numbers
                              const cleanNumber = e.target.value.replace(/[^\d]/g, '');
                              if (cleanNumber.length <= 9) {
                                const formatted = formatPhoneNumber(cleanNumber);
                                setMpesaInfo({...mpesaInfo, phoneNumber: formatted});
                              }
                            }}
                            onKeyPress={(e) => {
                              // Prevent non-numeric input
                              if (!/[0-9]/.test(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            onBlur={(e) => {
                              // Format the number on blur if it's not empty
                              const value = e.target.value.replace(/[^\d]/g, '');
                              if (value.length > 0) {
                                const formatted = formatPhoneNumber(value);
                                setMpesaInfo({...mpesaInfo, phoneNumber: formatted});
                              }
                            }}
                            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-r-md focus:outline-none focus:ring-0 text-white placeholder-slate-400 group-focus-within:border-green-500 group-focus-within:ring-2 group-focus-within:ring-green-500/20"
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Enter your M-Pesa registered phone number (9 digits)
                        </p>
                      </div>

                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:transform-none"
                      >
                        {isProcessing ? 'Processing...' : `Pay KES ${total.toLocaleString()}`}
                      </button>
                    </form>
                  </div>
                )}

                <div className="mt-6 pt-6 border-t border-slate-700/50">
                  <div className="flex items-center justify-center space-x-6 text-sm text-slate-400">
                    <div className="flex items-center space-x-1">
                      <Shield className="w-4 h-4" />
                      <span>SSL Encrypted</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <CreditCard className="w-4 h-4" />
                      <span>Secure Payment</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Order Summary</h3>
              
              <div className="space-y-4 mb-6">
                {state.items.map((item) => (
                  <div key={item.product.id} className="flex gap-3">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {item.product.name}
                      </h4>
                      <p className="text-sm text-slate-400">Qty: {item.quantity}</p>
                      <p className="text-sm font-semibold">
                        KES {(item.product.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 border-t border-slate-700/50 pt-4">
                <div className="flex justify-between text-slate-400">
                  <span className="text-slate-400">Subtotal (incl. VAT)</span>
                  <span className="font-medium">KES {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="text-slate-400">VAT (16%)</span>
                  <span className="font-medium">KES {tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="text-slate-400">Shipping</span>
                  <span className="font-medium">
                    {shippingCost === 0 ? 'FREE' : `KES ${shippingCost.toLocaleString()}`}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold border-t border-slate-700/50 pt-3">
                  <span>Total Amount</span>
                  <span>KES {total.toLocaleString()}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center space-x-2 text-green-400">
                  <Shield className="w-4 h-4" />
                  <span className="text-sm font-medium">Secure Checkout</span>
                </div>
                <p className="text-xs text-green-400/80 mt-1">
                  Your payment information is encrypted and secure
                </p>
              </div>
              <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <div className="flex items-center space-x-2 text-blue-400">
                  {/* Use Truck icon for delivery/shipping info */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H6a1 1 0 00-1 1v10m0 0H3m3 0h10m0 0h2.382a1 1 0 00.894-.553l1.382-2.764A1 1 0 0021 12.382V10a1 1 0 00-1-1h-5v7z" /></svg>
                  <span className="text-sm font-medium">Delivery Information</span>
                </div>
                <ul className="text-xs text-blue-400/80 mt-2 space-y-1 list-disc list-inside">
                  <li>Delivery within Nairobi CBD is <span className="font-semibold text-green-600">free</span>.</li>
                  <li>For all Orders, payment is required before delivery.</li>
                  <li>Choose your region to see available delivery options and costs.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage; 