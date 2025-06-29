import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface HeroSectionProps {
  onShopNowClick: () => void;
  onViewDealsClick: () => void;
}

interface BestSellingProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  rating: number | null;
  review_count: number | null;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onShopNowClick, onViewDealsClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bestSellingProducts, setBestSellingProducts] = useState<BestSellingProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch top 5 best-selling products from database
  useEffect(() => {
    const fetchBestSellingProducts = async () => {
      try {
        setLoading(true);
        
        // Query to get top 5 best-selling products
        // We'll use a combination of rating, review count, and is_bestseller flag
        const { data, error } = await supabase
          .from('products')
          .select(`
            id,
            name,
            slug,
            price,
            image_url,
            rating,
            review_count,
            is_bestseller
          `)
          .or('is_bestseller.eq.true,rating.gte.4.0')
          .order('rating', { ascending: false })
          .order('review_count', { ascending: false })
          .order('is_bestseller', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching best-selling products:', error);
          return;
        }

        // If we don't have enough bestsellers, fill with top-rated products
        if (data && data.length < 5) {
          const { data: additionalProducts, error: additionalError } = await supabase
            .from('products')
            .select(`
              id,
              name,
              slug,
              price,
              image_url,
              rating,
              review_count,
              is_bestseller
            `)
            .not('id', 'in', `(${data?.map(p => p.id).join(',')})`)
            .order('rating', { ascending: false })
            .order('review_count', { ascending: false })
            .limit(5 - (data?.length || 0));

          if (!additionalError && additionalProducts) {
            setBestSellingProducts([...(data || []), ...additionalProducts]);
          } else {
            setBestSellingProducts(data || []);
          }
        } else {
          setBestSellingProducts(data || []);
        }
      } catch (error) {
        console.error('Error fetching best-selling products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBestSellingProducts();
  }, []);

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    if (bestSellingProducts.length === 0) return;
    
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % bestSellingProducts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [bestSellingProducts.length]);

  const nextImage = () => {
    if (bestSellingProducts.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % bestSellingProducts.length);
  };

  const prevImage = () => {
    if (bestSellingProducts.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + bestSellingProducts.length) % bestSellingProducts.length);
  };

  const currentProduct = bestSellingProducts[currentImageIndex];

  // Format price to KES currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Get primary image URL for product
  const getProductImage = (product: BestSellingProduct) => {
    if (product.image_url) {
      return product.image_url;
    }
    // Fallback image if no image is available
    return 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=800';
  };

  return (
    <section className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white overflow-hidden" style={{ minHeight: 'calc(100vh - var(--header-height, 0px))' }}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 h-full flex items-center relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center py-6 sm:py-8 lg:py-12 w-full">
          {/* Hero Content - Order 1 on mobile, 1 on desktop */}
          <div className="space-y-8 sm:space-y-8 relative z-20 order-1 lg:order-1">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight text-center sm:text-left">
              Welcome to
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                {' '}TechMart
              </span>
            </h1>
            
            <p className="text-2xl sm:text-xl lg:text-2xl text-blue-100 leading-relaxed max-w-2xl text-center sm:text-left font-serif sm:font-sans">
            Power your digital life with cutting-edge tech. Discover premium laptops, gaming rigs, and more—backed by competitive pricing and expert support.
            </p>
            
            <div className="flex flex-row gap-3 sm:gap-4 relative z-30 justify-center sm:justify-start">
              <button 
                onClick={onShopNowClick}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 sm:px-8 sm:py-4 rounded-lg font-semibold text-lg sm:text-lg transition-all transform hover:scale-105 shadow-lg relative z-40"
              >
                <span className="sm:hidden">Shop</span>
                <span className="hidden sm:inline">Shop All Products</span>
              </button>
              <button 
                onClick={onViewDealsClick}
                className="border-2 border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4 sm:px-8 sm:py-4 rounded-lg font-semibold text-lg sm:text-lg transition-all relative z-40"
              >
                <span className="sm:hidden">Deals</span>
                <span className="hidden sm:inline">View Deals</span>
              </button>
            </div>
          </div>

          {/* Product Carousel - Order 2 on mobile, 2 on desktop */}
          <div className="relative z-20 h-full flex items-center order-2 lg:order-2 mt-6 sm:mt-0">
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 backdrop-blur-sm border border-white/10 w-full mx-auto">
              {loading ? (
                <div className="flex items-center justify-center h-[250px] sm:h-[300px] md:h-[350px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                </div>
              ) : bestSellingProducts.length === 0 ? (
                <div className="flex items-center justify-center h-[250px] sm:h-[300px] md:h-[350px] text-center">
                  <div>
                    <p className="text-lg text-blue-200 mb-2">No products available</p>
                    <p className="text-sm text-blue-300">Check back soon for our best sellers!</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative overflow-hidden rounded-xl sm:rounded-2xl">
                    <img
                      src={getProductImage(currentProduct)}
                      alt={currentProduct.name}
                      className="w-full h-[250px] sm:h-[300px] md:h-[350px] object-cover shadow-2xl transition-all duration-500"
                    />
                    
                    {/* Navigation Arrows */}
                    <button
                      onClick={prevImage}
                      className="absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-all duration-300 backdrop-blur-sm z-50"
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-6 sm:h-6" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-all duration-300 backdrop-blur-sm z-50"
                    >
                      <ChevronRight className="w-4 h-4 sm:w-6 sm:h-6" />
                    </button>

                    {/* Product Info Overlay */}
                    <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 right-2 sm:right-4 bg-black/60 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 text-white">
                      <h3 className="text-lg sm:text-xl font-bold">{currentProduct.name}</h3>
                      <p className="text-xl sm:text-2xl font-bold text-orange-400">{formatPrice(currentProduct.price)}</p>
                    </div>
                  </div>
                  
                  {/* Carousel Indicators */}
                  <div className="flex justify-center space-x-2 mt-4 sm:mt-6">
                    {bestSellingProducts.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 z-50 relative ${
                          index === currentImageIndex 
                            ? 'bg-orange-500 scale-125' 
                            : 'bg-white/50 hover:bg-white/70'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
              
              {/* Floating Cards */}
              <div className="absolute -top-2 -left-2 sm:-top-4 sm:-left-4 bg-white text-gray-900 p-2 sm:p-4 rounded-lg sm:rounded-xl shadow-lg">
                <div className="text-xs sm:text-sm text-gray-600">Best Sellers</div>
                <div className="text-sm sm:text-lg font-bold text-green-600">Top Rated</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Pattern - Lower z-index */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.1) 0%, transparent 50%)`
        }} />
      </div>
    </section>
  );
};

export default HeroSection;