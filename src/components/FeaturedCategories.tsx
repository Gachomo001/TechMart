import React, { useState, useEffect } from 'react';
import { Monitor, Laptop, Cpu, Headphones, Gamepad2, HardDrive } from 'lucide-react';
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
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Shop by Category</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find exactly what you're looking for in our comprehensive selection of computer products
            </p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-16 pb-12 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-24">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">Shop by Category</h2>
          <p className="text-2xl text-gray-600 max-w-2xl mx-auto">
            Find exactly what you're looking for in our comprehensive selection of computer products
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {categories.map((category) => {
            // Map category to appropriate icon and color
            let IconComponent = Monitor;
            let color = 'bg-blue-500';
            
            switch (category.slug.toLowerCase()) {
              case 'laptops':
                IconComponent = Laptop;
                color = 'bg-blue-500';
                break;
              case 'desktops':
                IconComponent = Monitor;
                color = 'bg-purple-500';
                break;
              case 'components':
                IconComponent = Cpu;
                color = 'bg-green-500';
                break;
              case 'peripherals':
                IconComponent = Headphones;
                color = 'bg-orange-500';
                break;
              case 'gaming':
                IconComponent = Gamepad2;
                color = 'bg-red-500';
                break;
              case 'storage':
                IconComponent = HardDrive;
                color = 'bg-indigo-500';
                break;
            }

            return (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category.slug)}
                className="group bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-105"
              >
                <div className={`${color} w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{category.name}</h3>
                <p className="text-sm text-gray-600">{category.description || 'Browse our selection'}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturedCategories;