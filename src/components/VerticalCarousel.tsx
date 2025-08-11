import React, { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Product } from '../types';

interface VerticalCarouselProps {
  products: Product[];
  title?: string;
  showOriginalPrice?: boolean;
  autoRotate?: boolean;
  rotateInterval?: number;
}

const VerticalCarousel: React.FC<VerticalCarouselProps> = ({
  products,
  title,
  showOriginalPrice = false,
  autoRotate = true,
  rotateInterval = 5000,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const totalProducts = products.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % totalProducts);
  }, [totalProducts]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + totalProducts) % totalProducts);
  }, [totalProducts]);

  // Auto-rotate functionality
  useEffect(() => {
    if (!autoRotate || isPaused || totalProducts <= 1) return;

    const interval = setInterval(() => {
      nextSlide();
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [currentIndex, isPaused, totalProducts, autoRotate, rotateInterval, nextSlide]);

  if (products.length === 0) {
    return (
      <div className="h-full bg-white rounded-lg shadow p-4 flex items-center justify-center">
        <p className="text-gray-500 text-center">No products available</p>
      </div>
    );
  }

  const currentProduct = products[currentIndex];
  const discount = currentProduct.original_price 
    ? Math.round(((currentProduct.original_price - currentProduct.price) / currentProduct.original_price) * 100)
    : 0;

  return (
    <div className="h-full">
      <div 
        className="relative h-full bg-white rounded-lg shadow overflow-hidden group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <Link to={`/product/${currentProduct.slug}`} className="block h-full w-full relative">
          {/* Background Image */}
          <div className="absolute inset-0">
            {currentProduct.image_url ? (
              <img
                src={currentProduct.image_url}
                alt={currentProduct.name}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=No+Image';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200">
                <span className="text-gray-500">No image available</span>
              </div>
            )}
          </div>
          
          {/* Gradient Overlay at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"></div>
          
          {/* Content Overlay */}
          <div className="relative h-full flex flex-col justify-end p-4">
            {/* Title and Top Controls */}
            <div className="absolute top-0 left-0 right-0 z-10">
              {/* Title */}
              {title && (
                <div className="bg-gradient-to-r from-black/70 to-black/40 text-white px-4 py-2">
                  <h3 className="text-lg font-semibold text-center drop-shadow-md">{title}</h3>
                </div>
              )}
              
              {/* Controls */}
              <div className="flex justify-between items-start p-2">
                {discount > 0 && showOriginalPrice && (
                  <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    -{discount}%
                  </div>
                )}
                <button 
                  className="bg-white/90 rounded-full p-1.5 shadow-md hover:bg-white transition-colors backdrop-blur-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // TODO: Add to wishlist
                  }}
                >
                  <Heart className="w-4 h-4 text-gray-700" />
                </button>
              </div>
            </div>
            
            {/* Product Info */}
            <div className="relative z-10 text-white">
              <h4 className="text-sm md:text-base font-medium mb-1 line-clamp-2 drop-shadow-sm">
                {currentProduct.name}
              </h4>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm md:text-base font-bold">
                    KES {currentProduct.price.toLocaleString()}
                  </span>
                  {showOriginalPrice && currentProduct.original_price && (
                    <span className="ml-2 text-xs text-gray-200 line-through">
                      KES {currentProduct.original_price.toLocaleString()}
                    </span>
                  )}
                </div>
                <button 
                  className="bg-white/90 text-blue-600 rounded-full p-1.5 hover:bg-white transition-colors backdrop-blur-sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // TODO: Add to cart
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </Link>
        
        {totalProducts > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevSlide();
              }}
              className="absolute top-1/2 left-2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1 shadow-md transition-all opacity-0 group-hover:opacity-100"
              aria-label="Previous product"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextSlide();
              }}
              className="absolute bottom-1/2 right-2 translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1 shadow-md transition-all opacity-0 group-hover:opacity-100"
              aria-label="Next product"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            
            {/* Slide indicators */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1">
              {products.map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentIndex(index);
                  }}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to product ${index + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerticalCarousel;
