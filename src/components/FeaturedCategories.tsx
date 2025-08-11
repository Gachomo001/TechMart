import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

const FeaturedCategories: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');

        if (error) throw error;
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryClick = (categorySlug: string) => {
    navigate(`/category/${categorySlug}`);
  };

  if (loading) {
    return (
      <section className="py-8 sm:py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Shop by Category</h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Find exactly what you're looking for in our comprehensive selection of computer products
            </p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 sm:py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Shop by Category</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Find exactly what you're looking for in our comprehensive selection of computer products
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {categories.map((category) => (
            <div 
              key={category.id}
              onClick={() => handleCategoryClick(category.slug)}
              className="group relative overflow-hidden rounded-2xl shadow-lg cursor-pointer hover:shadow-2xl transition-all duration-300 h-64"
            >
              {category.image_url ? (
                <div className="absolute inset-0">
                  <img 
                    src={category.image_url} 
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-blue-400" />
              )}
              
              <div className="relative h-full flex flex-col justify-end p-6 text-white">
                <h3 className="text-2xl font-bold mb-2 group-hover:translate-y-0.5 transition-transform">
                  {category.name}
                </h3>
                <p className="text-sm opacity-90 mb-4 line-clamp-2">
                  {category.description || 'Browse our selection of ' + category.name.toLowerCase()}
                </p>
                <button 
                  className="inline-flex items-center text-sm font-medium text-white/90 hover:text-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCategoryClick(category.slug);
                  }}
                >
                  Shop Now
                  <svg 
                    className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5l7 7-7 7" 
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;