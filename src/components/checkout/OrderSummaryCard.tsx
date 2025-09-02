import React from 'react';
import { CartItem, Product as BaseProduct } from '../../../types';

// Extend the base Product type to include product_images
type Product = BaseProduct & {
  product_images?: Array<{
    image_url: string;
    is_primary: boolean;
  }>;
};

interface OrderSummaryCardProps {
  items: CartItem[];
  totals: {
    subtotal: number;
    shippingCost: number;
    tax: number;
    total: number;
  };
}

const OrderSummaryCard: React.FC<OrderSummaryCardProps> = ({ items, totals }) => {

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 p-6 sticky top-24">
      <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
      <div className="space-y-4 mb-6">
        {items.map(item => (
          <div key={item.product.id} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <img 
                  src={getProductImage(item.product)} 
                  alt={item.product.name} 
                  className="w-16 h-16 object-cover rounded-lg"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/placeholder-product.jpg';
                  }}
                />
                <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {item.quantity}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium line-clamp-2 text-sm">{item.product.name}</p>
                <p className="text-sm text-slate-400">KES {item.product.price.toLocaleString()}</p>
              </div>
            </div>
            <p className="font-semibold">KES {(item.product.price * item.quantity).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2 border-t border-slate-700/50 pt-4">
        <div className="flex justify-between text-slate-300">
          <span>Subtotal (incl. VAT)</span>
          <span className="font-medium">KES {totals.subtotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>VAT (16%)</span>
          <span className="font-medium">KES {totals.tax.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-slate-300">
          <span>Shipping</span>
          <span className="font-medium">{totals.shippingCost > 0 ? `KES ${totals.shippingCost.toLocaleString()}` : 'Free'}</span>
        </div>
        <div className="flex justify-between text-xl font-bold pt-2">
          <span>Total</span>
          <span>KES {totals.total.toLocaleString()}</span>
        </div>
      </div>
      {/* <div className="mt-6 p-4 bg-green-500/10 rounded-lg border border-green-500/20">
        <div className="flex items-center space-x-2 text-green-400">
          <Shield className="w-4 h-4" />
          <span className="text-sm font-medium">Secure Checkout</span>
        </div>
        <p className="text-xs text-green-400/80 mt-1">
        Your payment information is secure and never stored on our servers
        </p>
      </div> */}
      <div className="mt-6 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
        <div className="flex items-center space-x-2 text-blue-400">
          {/* Use Truck icon for delivery/shipping info */}
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zm10 0a2 2 0 11-4 0 2 2 0 014 0zM13 16V6a1 1 0 00-1-1H6a1 1 0 00-1 1v10m0 0H3m3 0h10m0 0h2.382a1 1 0 00.894-.553l1.382-2.764A1 1 0 0021 12.382V10a1 1 0 00-1-1h-5v7z" /></svg>
          <span className="text-sm font-medium">Delivery Information</span>
        </div>
        <ul className="text-xs text-blue-400/80 mt-2 space-y-1 list-disc list-inside">
          {/* <li>Delivery within Nairobi CBD is <span className="font-semibold text-green-600">free</span>.</li> */}
          <li>For all Orders, payment is required before delivery.</li>
          <li>Choose your region to see available delivery options and costs.</li>
        </ul>
      </div>
    </div>
  );
};

// Helper function to get product image from product object
function getProductImage(product: Product): string {
  if (product.image) return product.image;
  if ('image_url' in product && product.image_url) return product.image_url as string;
  if (product.product_images && product.product_images.length > 0) {
    const primaryImage = product.product_images.find(img => img.is_primary);
    if (primaryImage) return primaryImage.image_url;
    return product.product_images[0].image_url;
  }
  return '/placeholder-product.jpg';
}

export default OrderSummaryCard;
