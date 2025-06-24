import { jsPDF } from 'jspdf';

interface ReceiptData {
  order_number: string;
  items: Array<{
    product: {
      name: string;
      price: number;
      image_url: string;
    };
    quantity: number;
    price_at_time: number;
  }>;
  shipping_info: {
    firstName: string;
    lastName: string;
    county: string;
    region: string;
    country: string;
    email?: string;
    phone: string;
  };
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  payment_method: 'card' | 'mpesa';
  payment_details: { phoneNumber?: string; cardLast4?: string } | null;
  shipping_type?: string;
}

export const generateReceiptPDF = async (orderData: ReceiptData): Promise<jsPDF> => {
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
    : `M-Pesa (${orderData.payment_details?.phoneNumber || ''})`;
  
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
      img.src = item.product.image_url;
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
      console.error('Error processing item image:', error);
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
  doc.text(`Shipping (${orderData.shipping_type || 'Standard'}):`, margin + 20, y);
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
  doc.text(`${orderData.shipping_info.county}, ${orderData.shipping_info.region}`, margin + 20, currentY);
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

  return doc;
}; 