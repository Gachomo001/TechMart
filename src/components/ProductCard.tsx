import React from 'react';
import { Star, ShoppingCart, Heart, Eye } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';

interface ProductCardProps {
  product: Product;
  onViewDetails: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetails }) => {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

  // Safe access for optional/computed fields
  const inStock = 'inStock' in product ? (product as any).inStock : (product.stock_quantity > 0);
  const image = 'image' in product ? (product as any).image : (product.image_url ?? '');
  const subcategory = 'subcategory' in product ? (product as any).subcategory : (product.subcategory_id ?? '');

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product);
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const handleViewDetails = () => {
    onViewDetails(product);
  };

  const discountPercentage = product.original_price 
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  // Determine stock status and color
  const getStockStatus = () => {
    if (!inStock) {
      return { text: 'Out of Stock', color: 'bg-red-500' };
    }
    return { text: 'In Stock', color: 'bg-green-500' };
  };

  const stockStatus = getStockStatus();

  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer">
      <div className="relative overflow-hidden rounded-t-xl">
        <img
          src={image}
          alt={product.name}
          className="w-full h-48 sm:h-56 md:h-64 object-cover group-hover:scale-105 transition-transform duration-300"
          onClick={handleViewDetails}
        />
        
        {/* Badges */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 flex flex-col gap-1 sm:gap-2">
          {product.is_bestseller && (
            <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              Bestseller
            </span>
          )}
          {discountPercentage > 0 && (
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              -{discountPercentage}% OFF
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="absolute top-2 sm:top-3 right-2 sm:right-3 flex flex-col gap-1 sm:gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button 
            onClick={handleWishlistToggle}
            className="bg-white/90 hover:bg-white p-1.5 sm:p-2 rounded-full shadow-lg transition-colors"
          >
            <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${isInWishlist(product.id) ? 'text-red-500 fill-current' : 'text-gray-600 hover:text-red-500'}`} />
          </button>
          <button 
            onClick={handleViewDetails}
            className="bg-white/90 hover:bg-white p-1.5 sm:p-2 rounded-full shadow-lg transition-colors"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-gray-600 hover:text-blue-500" />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* Category and Stock Status */}
        <div className="flex items-center justify-between mb-2">
          <p 
            className="text-xs sm:text-sm text-gray-500 capitalize truncate pr-2"
            title={window.innerWidth >= 768 ? subcategory : undefined}>
            {subcategory}
          </p>
          <span className={`${stockStatus.color} text-white px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap`}>
            {stockStatus.text}
          </span>
        </div>
        
        {/* Product name */}
        <h3 
          className="font-semibold text-gray-900 mb-2 truncate hover:text-blue-600 transition-colors cursor-pointer text-sm sm:text-base"
          onClick={handleViewDetails}
        >
          {product.name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 sm:w-4 sm:h-4 ${
                  i < Math.floor(product.rating)
                    ? 'text-yellow-400 fill-current'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs sm:text-sm text-gray-600">
            <span className="font-bold">{product.rating.toFixed(1)}</span> ({(product.review_count ?? 0).toLocaleString()})
          </span>
        </div>

        {/* Price */}
        <div className="flex flex-col gap-1 mb-4 min-h-[3rem] sm:min-h-[3.5rem]">
          {product.original_price ? (
            <span className="text-sm sm:text-lg text-gray-500 line-through">
              KES {(product.original_price ?? 0).toLocaleString()}
            </span>
          ) : (
            <div className="h-[1.25rem] sm:h-[1.5rem]"></div>
          )}
          <span className="text-xl sm:text-2xl font-bold text-gray-900">
            KES {(product.price ?? 0).toLocaleString()}
          </span>
        </div>

        {/* Add to cart button */}
        <button
          onClick={handleAddToCart}
          disabled={!inStock}
          className={`w-full flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-semibold transition-all text-sm sm:text-base ${
            inStock
              ? 'bg-blue-600 hover:bg-blue-700 text-white transform hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
          {inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;