import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface HeroSectionProps {
  onShopNowClick: () => void;
  onViewDealsClick: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onShopNowClick, onViewDealsClick }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Best selling product images
  const bestSellingProducts = [
    {
      image: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=800',
      name: 'MacBook Pro 16"',
      price: 'KES 3,499'
    },
    {
      image: 'https://images.pexels.com/photos/2582937/pexels-photo-2582937.jpeg?auto=compress&cs=tinysrgb&w=800',
      name: 'Gaming Desktop RTX 4080',
      price: 'KES 2,299'
    },
    {
      image: 'https://images.pexels.com/photos/2582928/pexels-photo-2582928.jpeg?auto=compress&cs=tinysrgb&w=800',
      name: 'RTX 4090 Graphics Card',
      price: 'KES 1,599'
    },
    {
      image: 'https://images.pexels.com/photos/777001/pexels-photo-777001.jpeg?auto=compress&cs=tinysrgb&w=800',
      name: '4K Gaming Monitor 32"',
      price: 'KES 799'
    },
    {
      image: 'https://images.pexels.com/photos/1194713/pexels-photo-1194713.jpeg?auto=compress&cs=tinysrgb&w=800',
      name: 'Mechanical Gaming Keyboard',
      price: 'KES 149'
    }
  ];

  // Auto-advance carousel every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % bestSellingProducts.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [bestSellingProducts.length]);

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % bestSellingProducts.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + bestSellingProducts.length) % bestSellingProducts.length);
  };

  const currentProduct = bestSellingProducts[currentImageIndex];

  return (
    <section className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white overflow-hidden min-h-[calc(100vh-128px)]">
      <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12 h-full flex items-center relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center py-8 lg:py-12 w-full">
          {/* Hero Content */}
          <div className="space-y-8 relative z-20">
            <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
              Welcome to
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                {' '}TechMart
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-blue-100 leading-relaxed max-w-2xl">
              Your ultimate destination for cutting-edge computer technology. From high-performance laptops 
              to powerful gaming rigs, we offer the latest innovations to power your digital life. 
              Discover premium quality products with unbeatable prices and exceptional customer service.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 relative z-30">
              <button 
                onClick={onShopNowClick}
                className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all transform hover:scale-105 shadow-lg relative z-40"
              >
                Shop All Products
              </button>
              <button 
                onClick={onViewDealsClick}
                className="border-2 border-white text-white hover:bg-white hover:text-blue-900 px-8 py-4 rounded-lg font-semibold text-lg transition-all relative z-40"
              >
                View Deals
              </button>
            </div>
            
            <div className="flex items-center space-x-12 pt-4">
              <div className="text-center">
                <div className="text-3xl font-bold">50K+</div>
                <div className="text-blue-200 text-sm">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="flex items-center text-3xl font-bold">
                  4.9 <Star className="w-6 h-6 text-yellow-400 ml-1 fill-current" />
                </div>
                <div className="text-blue-200 text-sm">Average Rating</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold">24/7</div>
                <div className="text-blue-200 text-sm">Support</div>
              </div>
            </div>
          </div>

          {/* Product Carousel */}
          <div className="relative z-20 h-full flex items-center">
            <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl p-6 lg:p-8 backdrop-blur-sm border border-white/10 w-[95%] mx-auto">
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src={currentProduct.image}
                  alt={currentProduct.name}
                  className="w-full h-[350px] object-cover shadow-2xl transition-all duration-500"
                />
                
                {/* Navigation Arrows */}
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm z-50"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm z-50"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>

                {/* Product Info Overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-xl p-4 text-white">
                  <h3 className="text-xl font-bold">{currentProduct.name}</h3>
                  <p className="text-2xl font-bold text-orange-400">{currentProduct.price}</p>
                </div>
              </div>
              
              {/* Carousel Indicators */}
              <div className="flex justify-center space-x-2 mt-6">
                {bestSellingProducts.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 z-50 relative ${
                      index === currentImageIndex 
                        ? 'bg-orange-500 scale-125' 
                        : 'bg-white/50 hover:bg-white/70'
                    }`}
                  />
                ))}
              </div>
              
              {/* Floating Cards */}
              <div className="absolute -top-4 -left-4 bg-white text-gray-900 p-4 rounded-xl shadow-lg">
                <div className="text-sm text-gray-600">Best Sellers</div>
                <div className="text-lg font-bold text-green-600">Top Rated</div>
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