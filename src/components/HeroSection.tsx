import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';

interface BestSellingProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  image_url: string | null;
  rating: number | null;
  review_count: number | null;
}

const HeroSection: React.FC = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [bestSellingProducts, setBestSellingProducts] = useState<BestSellingProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch top 5 best-selling products from database
  useEffect(() => {
    const fetchBestSellingProducts = async () => {
      try {
        setLoading(true);
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
    return 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=800';
  };

  // Debug log to confirm component is rendering
  useEffect(() => {
    console.log('HeroSection rendering - buttons should be visible');
  }, []);

  return (
    <section className="bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-900 overflow-hidden flex items-center" style={{ minHeight: 'calc(100vh - var(--header-height, 0px))' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-8 lg:py-16">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Hero Content - Order 2 on mobile, 1 on desktop */}
          <div className="order-2 lg:order-1 text-center lg:text-left relative z-10">
            <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-gray-900 mb-4 lg:mb-6">
              Build Your
              <span className="text-blue-600"> Dream</span>
              <br />Setup Today
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 mb-6 lg:mb-8 leading-relaxed">
              Discover premium computers, cutting-edge accessories, and everything you need 
              for work, gaming, and creativity. Free shipping on orders over $99.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start relative z-20">
              <button
                onClick={() => {
                  console.log('Shop Now button clicked');
                  console.log('Attempting to navigate to /all-products');
                  navigate('/all-products');
                }}
                className="bg-blue-600 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center group relative z-30 cursor-pointer"
                style={{ position: 'relative', zIndex: 999 }}
              >
                Shop Now
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => {
                  console.log('View Deals button clicked');
                  console.log('Attempting to navigate to /deals');
                  navigate('/deals');
                }}
                className="border-2 border-gray-300 text-gray-700 px-6 lg:px-8 py-3 lg:py-4 rounded-lg font-semibold hover:border-blue-600 hover:text-blue-600 transition-colors relative z-30 cursor-pointer"
                style={{ position: 'relative', zIndex: 999 }}
              >
                View Deals
              </button>
            </div>
          </div>
          {/* Product Carousel - Order 1 on mobile, 2 on desktop */}
          <div className="order-1 lg:order-2 relative z-20 h-full flex items-center mt-6 sm:mt-0">
            <div className="bg-gradient-to-br from-blue-500/60 to-indigo-500/60 rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 backdrop-blur-sm border border-white/10 w-full mx-auto">
              {loading ? (
                <div className="flex items-center justify-center h-[250px] sm:h-[300px] md:h-[350px]">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : bestSellingProducts.length === 0 ? (
                <div className="flex items-center justify-center h-[250px] sm:h-[300px] md:h-[350px] text-center">
                  <div>
                    <p className="text-lg text-blue-600 mb-2">No products available</p>
                    <p className="text-sm text-blue-500">Check back soon for our best sellers!</p>
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
                            : 'bg-blue-200 hover:bg-blue-400'
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
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                           radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.08) 0%, transparent 50%)`
        }} />
      </div>
    </section>
  );
};

export default HeroSection;