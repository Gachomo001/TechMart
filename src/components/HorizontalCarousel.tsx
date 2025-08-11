import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Heart, ShoppingCart } from 'lucide-react';
import { Product } from '../types';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import ProductModal from './ProductModal';

interface HorizontalCarouselProps {
  products: Product[];
  title?: string;
  showOriginalPrice?: boolean;
  autoRotate?: boolean;
  rotateInterval?: number;
  wishlistPosition?: 'left' | 'right';
  onViewDetails?: (product: Product) => void;
}

const HorizontalCarousel: React.FC<HorizontalCarouselProps> = ({
  products,
  title,
  showOriginalPrice = false,
  autoRotate = true,
  rotateInterval = 5000,
  wishlistPosition = 'right'
}) => {
  const { addToCart, state: cartState } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  
  const isInCart = useCallback((productId: string) => {
    return cartState.items.some(item => item.product.id === productId);
  }, [cartState.items]);
  
  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product);
  };

  const handleWishlistToggle = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };


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

  // Initialize state with the first product
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right');
  const [displayIndex, setDisplayIndex] = useState(0);
  const [displayProduct, setDisplayProduct] = useState<Product>(products[0] || {} as Product);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Update display product when products change
  useEffect(() => {
    if (products.length > 0) {
      setDisplayProduct(products[displayIndex]);
    }
  }, [products, displayIndex]);

  // Handle slide change with animation
  useEffect(() => {
    if (currentIndex !== displayIndex) {
      setIsTransitioning(true);
      // Set the new product immediately but keep it off-screen based on direction
      setDisplayProduct(products[currentIndex]);
      
      const timer = setTimeout(() => {
        // After the transition, update the display index and stop transitioning
        setDisplayIndex(currentIndex);
        setIsTransitioning(false);
      }, 300); // Match this with the transition duration in the CSS
      
      return () => clearTimeout(timer);
    }
  }, [currentIndex, displayIndex, products]);

  const handlePrev = useCallback(() => {
    setSlideDirection('left');
    // Set the new product immediately but keep it off-screen to the left
    const newIndex = (currentIndex - 1 + totalProducts) % totalProducts;
    setDisplayProduct(products[newIndex]);
    prevSlide();
  }, [prevSlide, currentIndex, products, totalProducts]);

  const handleNext = useCallback(() => {
    setSlideDirection('right');
    // Set the new product immediately but keep it off-screen to the right
    const newIndex = (currentIndex + 1) % totalProducts;
    setDisplayProduct(products[newIndex]);
    nextSlide();
  }, [nextSlide, currentIndex, products, totalProducts]);

  return (
    <div className="h-full">
      <div 
        className="relative h-full bg-white rounded-lg shadow overflow-hidden group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div 
          className="block h-full w-full relative overflow-hidden cursor-pointer"
          onClick={() => setSelectedProduct(displayProduct)}
        >
          {/* Background Image */}
          <div className="absolute inset-0">
            <div 
              className={`absolute inset-0 transition-transform duration-300 ease-in-out ${
                isTransitioning 
                  ? slideDirection === 'right' 
                    ? 'translate-x-full'  // Slide out to the right
                    : '-translate-x-full' // Slide out to the left
                  : 'translate-x-0'       // Normal position
              }`}
              key={`image-${displayIndex}`}
            >
              {displayProduct.image_url ? (
                <img
                  src={displayProduct.image_url}
                  alt={displayProduct.name}
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
          </div>
          
          {/* Gradient Overlay at Bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent"></div>
          
          {/* Content Overlay */}
          <div className="relative h-full flex flex-col justify-end p-4">
            {/* Title and Top Controls */}
            <div className={`absolute top-0 left-0 right-0 z-10 transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}>
              {/* Title */}
              {title && (
                <div className="bg-gradient-to-r from-black/70 to-black/40 text-white px-4 py-2">
                  <h3 className="text-lg font-semibold text-center drop-shadow-md">{title}</h3>
                </div>
              )}
              
              {/* Controls */}
              <div className={`flex ${wishlistPosition === 'right' ? 'justify-between' : 'justify-end'} items-start p-2`}>
                {wishlistPosition === 'left' && (
                  <div className="flex gap-2">
                    <button 
                      className="bg-white/90 rounded-full p-1.5 shadow-md hover:bg-white transition-colors backdrop-blur-sm"
                      onClick={(e) => handleWishlistToggle(e, displayProduct)}
                    >
                      <Heart 
                        className={`w-4 h-4 ${isInWishlist(displayProduct.id) ? 'text-red-500 fill-current' : 'text-gray-700 hover:text-red-500'}`} 
                      />
                    </button>
                    <button
                      className="bg-white/90 rounded-full p-1.5 shadow-md hover:bg-white transition-colors backdrop-blur-sm"
                      onClick={(e) => handleAddToCart(e, displayProduct)}
                    >
                      <ShoppingCart className={`w-4 h-4 ${isInCart(displayProduct.id) ? 'text-orange-500 fill-current' : 'text-blue-600'}`} />
                    </button>
                  </div>
                )}
                {discount > 0 && showOriginalPrice && (
                  <div className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                    -{discount}%
                  </div>
                )}
                {wishlistPosition === 'right' && (
                  <div className="flex gap-2">
                    <button 
                      className="bg-white/90 rounded-full p-1.5 shadow-md hover:bg-white transition-colors backdrop-blur-sm"
                      onClick={(e) => handleWishlistToggle(e, displayProduct)}
                    >
                      <Heart 
                        className={`w-4 h-4 ${isInWishlist(displayProduct.id) ? 'text-red-500 fill-current' : 'text-gray-700 hover:text-red-500'}`} 
                      />
                    </button>
                    <button
                      className="bg-white/90 rounded-full p-1.5 shadow-md hover:bg-white transition-colors backdrop-blur-sm"
                      onClick={(e) => handleAddToCart(e, displayProduct)}
                    >
                      <ShoppingCart className={`w-4 h-4 ${isInCart(displayProduct.id) ? 'text-orange-500 fill-current' : 'text-blue-600'}`} />
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Product Info */}
            <div className={`relative z-10 text-white transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}>
              <h4 className="text-sm md:text-base font-medium mb-1 line-clamp-2 drop-shadow-sm">
                {displayProduct.name}
              </h4>
              <div className="flex items-center justify-between">
                <div className="w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-base md:text-lg font-bold text-green-500">
                      KES {displayProduct.price.toLocaleString()}
                    </span>
                    {showOriginalPrice && displayProduct.original_price && (
                      <span className="ml-2 text-sm text-gray-300 line-through">
                        KES {displayProduct.original_price.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Product Modal */}
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            isOpen={!!selectedProduct}
            onClose={() => setSelectedProduct(null)}
          />
        )}
        
        {totalProducts > 1 && (
          <>
            <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1 shadow-md transition-all opacity-0 group-hover:opacity-100"
              aria-label="Previous product"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white text-gray-800 rounded-full p-1 shadow-md transition-all opacity-0 group-hover:opacity-100"
              aria-label="Next product"
            >
              <ChevronRight className="w-4 h-4" />
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

export default HorizontalCarousel;
