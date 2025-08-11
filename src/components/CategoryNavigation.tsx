import React, { useEffect, useState } from 'react';
import { Tag } from 'lucide-react';
import { preloadImage, getOptimizedImageUrl } from '../utils/imageUtils';

interface BaseCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isDeals?: boolean;
}

interface Category extends BaseCategory {
  image_url: string | null;
}

interface DealsCategory extends BaseCategory {
  isDeals: true;
  image_url: null;
}

interface CategoryNavigationProps {
  categories: Category[];
  onViewDealsClick: () => void;
  onCategoryClick: (slug: string) => void;
  isMenuOpen: boolean;
}

const CategoryNavigation: React.FC<CategoryNavigationProps> = ({
  categories,
  onViewDealsClick,
  onCategoryClick,
  isMenuOpen
}) => {
  const [imageStatus, setImageStatus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const preloadImages = async () => {
      const status: Record<string, boolean> = {};
      
      await Promise.all(
        categories.map(async (category) => {
          if (category.image_url) {
            try {
              const result = await preloadImage(getOptimizedImageUrl(category.image_url, 200));
              status[category.id] = result.success;
            } catch (error) {
              console.error(`Error preloading image for category ${category.name}:`, error);
              status[category.id] = false;
            }
          } else {
            status[category.id] = false;
          }
        })
      );
      
      setImageStatus(status);
    };

    preloadImages();
  }, [categories]);

  const renderCategoryItem = (category: Category | DealsCategory, isMobile = false) => (
    <button
      key={category.id}
      onClick={() => category.isDeals ? onViewDealsClick() : onCategoryClick(category.slug)}
      className={`flex-shrink-0 flex flex-col items-center ${isMobile ? 'w-28' : 'w-28 sm:w-32'}`}
    >
      <div className={`${isMobile ? 'w-20 h-16' : 'w-24 h-20 sm:w-28 sm:h-24'} 
        bg-gray-50 rounded-lg overflow-hidden mb-2 flex items-center justify-center 
        border border-gray-100 hover:shadow-md transition-all duration-200`}>
        {category.isDeals ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
            <Tag className="w-8 h-8 text-orange-500" strokeWidth={1.5} />
          </div>
        ) : category.image_url && imageStatus[category.id] ? (
          <img
            src={getOptimizedImageUrl(category.image_url, 200)}
            alt={category.name}
            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={(e) => {
              console.error('Image failed to load:', {
                name: category.name,
                url: category.image_url,
                timestamp: new Date().toISOString()
              });
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400 text-lg sm:text-xl font-medium">
              {category.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <span className={`text-xs font-medium text-center text-gray-700 group-hover:text-blue-600 
        transition-colors w-full truncate px-1 ${isMobile ? 'text-xs' : 'text-[10px] sm:text-xs'}`}>
        {category.name}
      </span>
    </button>
  );

  // Create a deals category item with a tag icon
  const dealsCategory: DealsCategory = {
    id: 'deals',
    name: 'Deals',
    slug: 'deals',
    isDeals: true, // Special flag for deals category
    image_url: null
  };

  // Combine deals category with other categories
  const allCategories = [dealsCategory, ...categories];

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      {/* Desktop Navigation */}
      <div className="hidden md:block">
        <div className="flex overflow-x-auto pb-3 px-4 scrollbar-hide whitespace-nowrap">
          <div className="inline-flex gap-4">
            {allCategories.map((category) => renderCategoryItem(category))}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden">
        {isMenuOpen && (
          <div className="overflow-x-auto pb-3 px-4 scrollbar-hide">
            <div className="inline-flex gap-4">
              {allCategories.map((category) => renderCategoryItem(category, true))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryNavigation;
