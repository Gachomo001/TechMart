import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Product } from '../types';
import PromotionBar from './PromotionBar';

interface ProductImage {
  image_url: string;
  is_primary: boolean;
}
import HorizontalCarousel from './HorizontalCarousel';

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  price: string;
  buttonText: string;
  image: string;
}

const HeroSection: React.FC = (): JSX.Element => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [bestsellers, setBestsellers] = useState<Product[]>([]);
  const [deals, setDeals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const autoSlideInterval = useRef<NodeJS.Timeout | null>(null);

  const SLIDE_INTERVAL = 8000; // 8 seconds

  // Tech-focused banner slides (excluding Smartphones and Smart Home)
  const slides: Slide[] = [
    {
      id: 1,
      title: 'Latest Laptops',
      subtitle: 'Powerful performance for work and play',
      price: 'Starting at KES 12,999',
      buttonText: 'Shop Now',
      image: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2071&q=80'
    },
    {
      id: 3,
      title: 'Gaming PCs',
      subtitle: 'Ultimate gaming experience',
      price: 'Custom builds available',
      buttonText: 'Build Yours',
      image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80'
    },
    {
      id: 4,
      title: 'Audio & Headphones',
      subtitle: 'Immersive sound experience',
      price: 'Starting at KES 1,499',
      buttonText: 'Listen Now',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=2070&q=80'
    },
    {
      id: 6,
      title: 'Wearables',
      subtitle: 'Track your fitness and more',
      price: 'Up to 25% off',
      buttonText: 'Shop Now',
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1999&q=80'
    }
  ];

  // Fetch bestsellers and deals
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch bestsellers
      const { data: bestsellersData } = await supabase
        .from('products')
        .select('*')
        .eq('is_bestseller', true)
        .limit(6);
      
      // Fetch products with discounts (deals) - get top 10 by discount percentage
      const { data: dealsData } = await supabase
        .from('products')
        .select(`
          *,
          product_images(image_url, is_primary)
        `)
        .not('original_price', 'is', null)
        .order('created_at', { ascending: false });
      
      if (bestsellersData) setBestsellers(bestsellersData);
      
      if (dealsData) {
        // Calculate discount percentage for each product
        const productsWithDiscounts = dealsData.map(product => {
          const discount = ((product.original_price - product.price) / product.original_price) * 100;
          return {
            ...product,
            discount_percentage: Math.round(discount)
          };
        });
        
        // Sort by discount percentage (highest first) and take top 10
        const sortedDeals = [...productsWithDiscounts]
          .sort((a, b) => b.discount_percentage - a.discount_percentage)
          .slice(0, 10);
        
        // Map to include primary image
        const dealsWithImages = sortedDeals.map(product => ({
          ...product,
          // Use primary image if available, otherwise first image, otherwise empty string
          image_url: product.product_images?.find((img: ProductImage) => img.is_primary)?.image_url || 
                    (product.product_images?.[0]?.image_url || '')
        }));
        
        setDeals(dealsWithImages);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const startAutoSlide = useCallback(() => {
    // Clear any existing interval
    if (autoSlideInterval.current) {
      clearInterval(autoSlideInterval.current);
    }
    
    // Start a new interval
    autoSlideInterval.current = setInterval(() => {
      setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
    }, SLIDE_INTERVAL);
    
    return autoSlideInterval.current;
  }, [slides.length]);

  // Initialize auto-slide on component mount
  useEffect(() => {
    startAutoSlide();
    
    // Clean up interval on component unmount
    return () => {
      if (autoSlideInterval.current) {
        clearInterval(autoSlideInterval.current);
      }
    };
  }, [startAutoSlide]);

  const nextSlide = () => {
    setCurrentSlide(prev => (prev === slides.length - 1 ? 0 : prev + 1));
    startAutoSlide(); // Restart the timer on manual navigation
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1));
    startAutoSlide(); // Restart the timer on manual navigation
  };

  if (loading) {
    return (
      <div className="relative bg-gray-50 overflow-hidden" style={{ height: 'calc(100vh - var(--header-height, 64px) - 0px)' }}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-gray-50 overflow-hidden">
      <div className="flex flex-col" style={{ height: 'calc(100vh - var(--header-height, 64px) - 0px)' }}>
        <div className="flex-1 flex overflow-hidden">
          {/* Left Side - Bestsellers Carousel (25% width) */}
          <div className="w-1/4 h-full hidden lg:flex flex-col border-r border-gray-200">
            <div className="flex-1 overflow-hidden bg-white">
              <HorizontalCarousel 
                products={bestsellers}
                title="Bestsellers"
                showOriginalPrice={false}
                autoRotate={true}
                rotateInterval={5000}
                wishlistPosition="left"
              />
            </div>
          </div>
          
          {/* Middle - Hero Slider (50% width) */}
          <div className="w-full lg:w-2/4 h-full relative overflow-hidden">
            <div
              className="flex transition-transform duration-1000 ease-out h-full"
              style={{
                transform: `translateX(-${currentSlide * 100}%)`,
              }}
            >
              {slides.map((slide) => (
                <div
                  key={slide.id}
                  className="min-w-full h-full relative flex items-center justify-center"
                >
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40" />
                  <div className="relative z-10 text-white text-center px-4 max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-4 drop-shadow-lg">
                      {slide.title}
                    </h2>
                    <p className="text-lg md:text-xl lg:text-2xl mb-6 drop-shadow-md">
                      {slide.subtitle}
                    </p>
                    <div className="text-2xl md:text-3xl font-bold mb-8 drop-shadow-md">
                      {slide.price}
                    </div>
                    <button 
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 md:px-8 md:py-3 rounded-md transition-all transform hover:scale-105 text-sm md:text-base cursor-default"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      aria-label={slide.buttonText}
                    >
                      {slide.buttonText}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Navigation Arrows */}
            <button 
              onClick={prevSlide}
              className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white p-1 md:p-2 rounded-full hover:bg-black/70 transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft size={24} className="w-5 h-5 md:w-8 md:h-8" />
            </button>
            <button 
              onClick={nextSlide}
              className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10 bg-black/50 text-white p-1 md:p-2 rounded-full hover:bg-black/70 transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight size={24} className="w-5 h-5 md:w-8 md:h-8" />
            </button>
            
            {/* Slide Indicators */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-2 z-10">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-white' : 'bg-white/50'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
          </div>
          
          {/* Right Side - Deals Carousel (25% width) */}
          <div className="w-1/4 h-full hidden lg:flex flex-col border-l border-gray-200">
            <div className="flex-1 overflow-hidden bg-white">
              <HorizontalCarousel 
                products={deals}
                title="Hot Deals"
                showOriginalPrice={true}
                autoRotate={true}
                rotateInterval={6000}
                wishlistPosition="right"
              />
            </div>
          </div>
        </div>
        
        {/* Promotion Bar - Fixed at the bottom of the hero section */}
        <div className="w-full mt-auto">
          <PromotionBar />
        </div>
      </div>
    </div>
  );
};

export default HeroSection;