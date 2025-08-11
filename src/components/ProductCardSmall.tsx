import React from 'react';
import { Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '../types';

interface ProductCardSmallProps {
  product: Product;
  showOriginalPrice?: boolean;
}

const ProductCardSmall: React.FC<ProductCardSmallProps> = ({ 
  product, 
  showOriginalPrice = false 
}) => {
  const discount = product.original_price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100) 
    : 0;

  return (
    <Link 
      to={`/product/${product.slug}`}
      className="block group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col"
    >
      <div className="relative pt-[100%] bg-gray-50">
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-contain p-2"
            loading="lazy"
          />
        )}
        {discount > 0 && showOriginalPrice && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
            -{discount}%
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-1">
          {product.name}
        </h3>
        <div className="mt-auto">
          <div className="flex items-center mb-1">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  className={`h-3 w-3 ${i < Math.floor(product.rating || 0) ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 ml-1">({product.review_count || 0})</span>
          </div>
          <div className="flex items-baseline">
            <span className="text-sm font-semibold text-gray-900">
              KSh {product.price.toLocaleString()}
            </span>
            {showOriginalPrice && product.original_price && (
              <span className="ml-2 text-xs text-gray-500 line-through">
                KSh {product.original_price.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCardSmall;
