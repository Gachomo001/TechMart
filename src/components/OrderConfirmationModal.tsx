import React, { useRef, useEffect, useState } from 'react';
import { Check, Download } from 'lucide-react';
import { CartItem } from '../../types';
import jsPDF from 'jspdf';
import { UserOptions } from 'jspdf-autotable';

// Add type augmentation for jsPDF
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
    autoTable: (options: UserOptions) => jsPDF;
  }
}

interface OrderConfirmationModalProps {
  isOpen: boolean;
  orderNumber: string;
  orderNumberDisplay?: string;
  orderItems: CartItem[];
  orderTotals: {
    subtotal: number;
    tax: number;
    shippingCost: number;
    total: number;
  };
  shippingInfo: {
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
  paymentMethod: 'card' | 'mobile_money' | 'bank_transfer' | 'ussd';
  paymentDetails?: any;
  onContinueShopping: () => void;
}

const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({
  isOpen,
  orderNumber,
  orderNumberDisplay,
  orderItems,
  orderTotals,
  shippingInfo,
  paymentMethod,
  paymentDetails,
  onContinueShopping,
}) => {
  const orderConfirmedModalRef = useRef<HTMLDivElement>(null);

  // Resolve county/region names if UUIDs were passed
  const [countyName, setCountyName] = useState<string>('');
  const [regionName, setRegionName] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    const looksLikeUUID = (v?: string) => !!v && /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/.test(v);

    const fetchName = async (type: 'county' | 'region', id: string) => {
      try {
        const res = await fetch(`/api/locations?type=${type}`);
        if (!res.ok) return null;
        const data = await res.json();
        const list = Array.isArray(data?.data) ? data.data : [];
        const match = list.find((l: any) => l.id === id);
        return match?.name || null;
      } catch {
        return null;
      }
    };

    (async () => {
      if (looksLikeUUID(shippingInfo.county)) {
        const name = await fetchName('county', shippingInfo.county);
        if (name) setCountyName(name);
      } else if (shippingInfo.county) {
        setCountyName(shippingInfo.county);
      }

      if (looksLikeUUID(shippingInfo.region)) {
        const name = await fetchName('region', shippingInfo.region);
        if (name) setRegionName(name);
      } else if (shippingInfo.region) {
        setRegionName(shippingInfo.region);
      }
    })();
  }, [isOpen, shippingInfo.county, shippingInfo.region]);

  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    const p = phone.replace(/\s+/g, '');
    if (p.startsWith('+254')) return p;
    if (p.startsWith('254')) return `+${p}`;
    if (p.startsWith('0') && p[1] === '7') return `+254 ${p.slice(1)}`;
    if (p.startsWith('7')) return `+254 ${p}`;
    return p; // fallback
  };

  if (!isOpen) return null;

  const getPaymentMethodDisplay = () => {
    switch (paymentMethod) {
      case 'card':
        return paymentDetails?.cardLast4 ? `Card ending in ${paymentDetails.cardLast4}` : 'Credit/Debit Card';
      case 'mobile_money':
        return paymentDetails?.phoneNumber ? `Mobile Money (${paymentDetails.phoneNumber})` : 'Mobile Money';
      case 'bank_transfer':
        return 'Bank Transfer';
      case 'ussd':
        return 'USSD';
      default:
        return 'Unknown';
    }
  };

  const handleDownloadReceipt = async () => {
    try {
      const orderData = {
        order_number: orderNumberDisplay || orderNumber, // Use human-readable order number for PDF
        payment_method: paymentMethod,
        payment_details: paymentDetails,
        shipping_info: {
          ...shippingInfo,
          county: countyName || shippingInfo.county,
          region: regionName || shippingInfo.region,
          phone: formatPhone(shippingInfo.phone),
        },
        items: orderItems,
        subtotal: orderTotals.subtotal,
        shipping_cost: orderTotals.shippingCost,
        tax_amount: orderTotals.tax,
        total_amount: orderTotals.total,
        shipping_type: shippingInfo.shippingType
      };
      
      const doc = await generateReceiptPDF(orderData);
      doc.save(`Raiyaaa_Receipt_${orderNumberDisplay || orderNumber}.pdf`);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt. Please try again.');
    }
  };

  const generateReceiptPDF = async (orderData: any) => {
    const doc = new jsPDF({
      unit: 'px',
      format: [595.28, 841.89],
      orientation: 'portrait'
    });

    doc.setFont('helvetica');
    
    const margin = 40;
    const cardWidth = 595.28 - (margin * 2);
    const cardHeight = 841.89 - (margin * 2);
    
    // Add white background
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, margin, cardWidth, cardHeight, 'F');
    
    // Draw border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(2);
    doc.rect(margin, margin, cardWidth, cardHeight);

    // Header titles to mirror modal
    doc.setFontSize(38);
    doc.setTextColor(96, 165, 250); // blue-ish as proxy for gradient
    doc.setFont('helvetica', 'bold');
    doc.text('Raiyaaa', 297.64, margin + 40, { align: 'center' });
    
    // "Order Receipt" subtitle
    doc.setFontSize(16);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text('Order Receipt', 297.64, margin + 60, { align: 'center' });

    let currentY = margin + 100;
    
    // Order details (mirror modal top grid)
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.text('Order Number:', margin + 20, currentY);
    doc.setFontSize(16);
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    const displayOrderNumber = orderNumberDisplay || orderNumber;
    doc.text(`${displayOrderNumber}`, margin + 20, currentY + 20);
    
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Order Date:', cardWidth + margin - 20, currentY, { align: 'right' });
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(new Date().toLocaleDateString(), cardWidth + margin - 20, currentY + 20, { align: 'right' });
    
    currentY += 60;

    // Payment method and status row
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Payment Method:', margin + 20, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const pmDisplay = (() => {
      const pm = orderData.payment_method;
      if (pm === 'card') return orderData.payment_details?.cardLast4 ? `Card ending in ${orderData.payment_details.cardLast4}` : 'Credit/Debit Card';
      if (pm === 'mobile_money') return orderData.payment_details?.phoneNumber ? `Mobile Money (${orderData.payment_details.phoneNumber})` : 'Mobile Money';
      if (pm === 'bank_transfer') return 'Bank Transfer';
      if (pm === 'ussd') return 'USSD';
      return 'Unknown';
    })();
    doc.text(pmDisplay, margin + 20, currentY + 20);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Status:', cardWidth + margin - 20, currentY, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94); // green
    doc.text('Confirmed', cardWidth + margin - 20, currentY + 20, { align: 'right' });

    currentY += 60;

    // Items section
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Items Ordered', margin + 20, currentY);
    currentY += 24;

    // Pagination constants and helpers
    const rightPadding = 20;
    const itemImgSize = 72;
    const itemGap = 20;
    const nameFontSize = 16;
    const qtyFontSize = 14;
    const totalFontSize = 18;
    const sectionGapAfterItems = 30; // space before totals
    const maxY = margin + cardHeight - 40; // bottom boundary inside card

    const startNewPage = () => {
      doc.addPage();
      // redraw outline
      doc.setLineWidth(2);
      doc.rect(margin, margin, cardWidth, cardHeight);
      // continue items on new page below top padding
      currentY = margin + 40;
    };

    // Draw items list with page breaks at item boundaries
    for (const item of orderData.items) {
      // Measure this item's height first
      const nameXMeasure = margin + 100;
      const nameMaxWidthMeasure = cardWidth - (nameXMeasure - margin) - rightPadding;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(nameFontSize);
      const measureLines = doc.splitTextToSize(item.product.name, nameMaxWidthMeasure) as string[];
      const measureLineHeight = Math.round(nameFontSize * 1.1);
      const nameBlockHeightMeasure = (measureLines.length || 1) * measureLineHeight;
      const qtyRowHeightMeasure = Math.round(qtyFontSize * 1.2);
      const contentHeightMeasure = (20 + nameBlockHeightMeasure + 6 + qtyRowHeightMeasure + 12);
      const blockHeightMeasure = Math.max(itemImgSize, contentHeightMeasure);

      if (currentY + blockHeightMeasure > maxY) {
        startNewPage();
      }

      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = item.product.image || item.product.image_url;
        
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = () => resolve(null); // Continue even if image fails
        });

        // Image
        if (img.complete && img.naturalHeight !== 0) {
          doc.addImage(img, 'JPEG', margin + 20, currentY, itemImgSize, itemImgSize, undefined, 'FAST');
        }

        // Compute wrapped name and dynamic heights
        const nameX = margin + 100;
        const nameY = currentY + Math.min(20, Math.max(12, Math.floor(itemImgSize * 0.28))); // relative to image size
        const nameMaxWidth = cardWidth - (nameX - margin) - rightPadding; // right padding
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(nameFontSize);
        doc.setTextColor(15, 23, 42);
        const nameLines = doc.splitTextToSize(item.product.name, nameMaxWidth);
        doc.text(nameLines as any, nameX, nameY);
        const lineHeight = Math.round(nameFontSize * 1.1);
        const nameBlockHeight = (Array.isArray(nameLines) ? nameLines.length : 1) * lineHeight;

        // Second row positions under name block
        const infoY = nameY + nameBlockHeight + 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(qtyFontSize);
        doc.setTextColor(71, 85, 105);
        doc.text(`Qty: ${item.quantity} × KES ${item.product.price.toLocaleString()}`, nameX, infoY);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(totalFontSize);
        doc.setTextColor(22, 163, 74); // green
        doc.text(
          `KES ${(item.product.price * item.quantity).toLocaleString()}`,
          cardWidth + margin - 20,
          infoY,
          { align: 'right' }
        );

        // Determine block height: max of image height vs name+row
        const contentHeight = (infoY - currentY) + 12; // bottom padding
        const blockHeight = Math.max(itemImgSize, contentHeight);
        currentY += blockHeight + itemGap; // gap between items
      } catch (error) {
        console.error('Error processing item:', error);
        currentY += Math.max(itemImgSize + itemGap, 80);
      }
    }

    // Before totals, ensure whole 'Order Summary' fits on this page; otherwise move it entirely to next page
    const totalsHeightEstimate = 24 /*title*/ + 20 /*subtotal*/ + 20 /*vat*/ + 20 /*shipping*/ + 20 /*total*/ + 6;
    if (currentY + sectionGapAfterItems + totalsHeightEstimate > maxY) {
      startNewPage();
    } else {
      currentY += sectionGapAfterItems;
    }

    // Totals section
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Order Summary', margin + 20, currentY);
    currentY += 24;
    
    // Subtotal
    doc.setFontSize(14);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.text('Subtotal (incl. VAT)', margin + 20, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`KES ${orderData.subtotal.toLocaleString()}`, cardWidth + margin - 20, currentY, { align: 'right' });
    currentY += 20;
    
    // VAT
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('VAT (16%)', margin + 20, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`KES ${orderData.tax_amount.toLocaleString()}`, cardWidth + margin - 20, currentY, { align: 'right' });
    currentY += 20;
    
    // Shipping cost
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text(`Shipping (${orderData.shipping_type || 'Standard'})`, margin + 20, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`KES ${orderData.shipping_cost.toLocaleString()}`, cardWidth + margin - 20, currentY, { align: 'right' });
    currentY += 20;
    
    // Total amount
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('Total Amount', margin + 20, currentY);
    doc.setTextColor(22, 163, 74);
    doc.text(`KES ${orderData.total_amount.toLocaleString()}`, cardWidth + margin - 20, currentY, { align: 'right' });

    // Before Shipping Information, ensure the whole section fits; otherwise move to next page
    const hasEmail = Boolean(orderData.shipping_info?.email);
    const shippingLines = 1 /*header*/ + 1 /*name*/ + 1 /*county/region*/ + 1 /*country*/ + (hasEmail ? 1 : 0) + 1 /*phone*/;
    const shippingHeightEstimate = 50 /*gap*/ + 16 /*header font size baseline*/ + (shippingLines * 20) + 6;
    if (currentY + shippingHeightEstimate > maxY) {
      startNewPage();
    } else {
      currentY += 50;
    }
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text('Shipping Information', margin + 20, currentY);
    currentY += 24;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(14);
    doc.text(`${orderData.shipping_info.firstName} ${orderData.shipping_info.lastName}`, margin + 20, currentY);
    currentY += 20;
    if (orderData.shipping_info.isCustomLocation) {
      doc.text(`${orderData.shipping_info.customCounty}, ${orderData.shipping_info.customRegion}`, margin + 20, currentY);
    } else {
      doc.text(`${orderData.shipping_info.county}, ${orderData.shipping_info.region}`, margin + 20, currentY);
    }
    currentY += 20;
    doc.text(`${orderData.shipping_info.country}`, margin + 20, currentY);
    currentY += 20;
    if (orderData.shipping_info.email) {
      doc.setTextColor(37, 99, 235);
      doc.text(`${orderData.shipping_info.email}`, margin + 20, currentY);
      currentY += 20;
    }
    doc.setTextColor(71, 85, 105);
    doc.text(`${orderData.shipping_info.phone || ''}`, margin + 20, currentY);

    return doc;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center py-12"
      onClick={onContinueShopping}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        ref={orderConfirmedModalRef}
        className="bg-white rounded-xl max-w-4xl w-full mx-4 overflow-hidden relative z-10"
        onClick={(e) => e.stopPropagation()}
      >
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
                <h3 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-4 leading-normal">Raiyaaa</h3>
                <p className="text-slate-600">Order Receipt</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600">Order Number:</span>
                  <p className="font-mono font-bold text-lg text-blue-600">{orderNumberDisplay || orderNumber}</p>
                </div>
                <div className="text-right">
                  <span className="text-slate-600">Order Date:</span>
                  <p className="font-semibold text-slate-900">{new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <span className="text-slate-600">Payment Method:</span>
                  <p className="font-semibold text-slate-900">{getPaymentMethodDisplay()}</p>
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
                  orderItems.map((item) => (
                    <div key={item.product.id} className="flex items-start py-3 border-b border-slate-100 last:border-b-0">
                      <div className="flex items-start space-x-4 w-full">
                        <img 
                          src={item.product.image || item.product.image_url} 
                          alt={item.product.name}
                          className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900">{item.product.name}</p>
                          <div className="mt-1 flex items-center justify-between">
                            <p className="text-sm text-slate-600">Qty: {item.quantity} × KES {item.product.price.toLocaleString()}</p>
                            <p className="text-xl font-bold text-green-600">KES {(item.product.price * item.quantity).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
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
                {shippingInfo.isCustomLocation ? (
                  <p>{shippingInfo.customCounty}, {shippingInfo.customRegion}</p>
                ) : (
                  <p>{countyName || shippingInfo.county}, {regionName || shippingInfo.region}</p>
                )}
                <p>{shippingInfo.country}</p>
                {shippingInfo.email && <p className="text-blue-600">{shippingInfo.email}</p>}
                <p>{formatPhone(shippingInfo.phone)}</p>
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
              onClick={onContinueShopping}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-all transform hover:scale-[1.02]"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmationModal;
