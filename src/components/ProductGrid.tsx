import React, { useState, useMemo, useEffect } from 'react';
import { Filter } from 'lucide-react';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import { Product } from '../types';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
}

interface Subcategory {
  id: string;
  name: string;
  slug: string;
  category_id: string;
}

interface ProductGridProps {
  products: Product[];
  title?: string;
  onSignInRequired?: () => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, title = "All Products", onSignInRequired }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState('featured');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch categories and subcategories
  useEffect(() => {
    const fetchCategoriesAndSubcategories = async () => {
      try {
        setIsLoading(true);
        // Fetch categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        if (categoriesError) throw categoriesError;
        // Fetch subcategories
        const { data: subcategoriesData, error: subcategoriesError } = await supabase
          .from('subcategories')
          .select('*')
          .order('name');
        if (subcategoriesError) throw subcategoriesError;
        setCategories(categoriesData || []);
        setSubcategories(subcategoriesData || []);
      } catch (error) {
        console.error('Error fetching categories and subcategories:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCategoriesAndSubcategories();
  }, []);

  // Set max price based on highest product price
  useEffect(() => {
    if (products.length > 0) {
      const highestPrice = Math.max(...products.map(p => p.price));
      // Round up to nearest thousand for better UX
      const roundedMaxPrice = Math.ceil(highestPrice / 1000) * 1000;
      setPriceRange([0, roundedMaxPrice]);
      setMaxPrice(roundedMaxPrice.toString());
    }
  }, [products]);

  const handlePriceChange = (type: 'min' | 'max', value: string) => {
    const numValue = value === '' ? 0 : Number(value);
    
    if (type === 'min') {
      setMinPrice(value);
      setPriceRange([numValue, priceRange[1]]);
    } else {
      setMaxPrice(value);
      setPriceRange([priceRange[0], numValue]);
    }
  };

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const inPriceRange = product.price >= priceRange[0] && product.price <= priceRange[1];
      const inCategory = selectedCategories.length === 0 || selectedCategories.includes(product.category_id || '');
      const inSubcategory = selectedSubcategories.length === 0 || selectedSubcategories.includes(product.subcategory_id || '');
      const stockFilter = !inStockOnly || product.stock_quantity > 0;
      return inPriceRange && inCategory && inSubcategory && stockFilter;
    });

    // Sort products
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
        filtered.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
        break;
      default: // featured
        filtered.sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          if (a.is_bestseller && !b.is_bestseller) return -1;
          if (!a.is_bestseller && b.is_bestseller) return 1;
          return b.rating - a.rating;
        });
    }

    return filtered;
  }, [products, sortBy, priceRange, selectedCategories, selectedSubcategories, inStockOnly]);

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const handleSubcategoryToggle = (subcategory: string) => {
    setSelectedSubcategories(prev =>
      prev.includes(subcategory)
        ? prev.filter(s => s !== subcategory)
        : [...prev, subcategory]
    );
  };

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedSubcategories([]);
    const currentMax = priceRange[1];
    setPriceRange([0, currentMax]);
    setMinPrice('');
    setMaxPrice(currentMax.toString());
    setInStockOnly(false);
  };

  // Define hasActiveFilters
  const hasActiveFilters = selectedCategories.length > 0 || 
    selectedSubcategories.length > 0 || 
    priceRange[0] > 0 || 
    priceRange[1] < priceRange[1] ||
    inStockOnly;

  return (
    <div className="container mx-auto px-4 py-4" style={{ paddingTop: '60px' }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">
            Showing {filteredAndSortedProducts.length} of {products.length} products
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors lg:hidden text-sm sm:text-base"
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                !
              </span>
            )}
          </button>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
            <option value="name">Name: A to Z</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
        {/* Filters Sidebar */}
        <div className={`w-full lg:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-gray-200">Filters</h2>

            {/* Price Range Filter */}
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Price Range</h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-2">
                  <div className="flex-1 w-full sm:w-auto">
                    <label htmlFor="minPrice" className="block text-sm text-gray-600 mb-1">Min Price (KES)</label>
                    <input
                      type="number"
                      id="minPrice"
                      value={minPrice}
                      onChange={(e) => handlePriceChange('min', e.target.value)}
                      placeholder="0"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                    />
                  </div>
                  <div className="flex-1 w-full sm:w-auto">
                    <label htmlFor="maxPrice" className="block text-sm text-gray-600 mb-1">Max Price (KES)</label>
                <input
                      type="number"
                      id="maxPrice"
                      value={maxPrice}
                      onChange={(e) => handlePriceChange('max', e.target.value)}
                      placeholder={maxPrice}
                  min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Categories Filter */}
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Categories</h3>
              {isLoading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto pr-2">
                  {categories.map(category => (
                    <label key={category.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{category.name}</span>
              </label>
                  ))}
                </div>
              )}
            </div>

            {/* Subcategories Filter */}
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Subcategories</h3>
              {isLoading ? (
                <div className="flex justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 sm:h-6 sm:w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 sm:max-h-48 overflow-y-auto pr-2">
                {subcategories.map(subcategory => (
                    <label key={subcategory.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                        checked={selectedSubcategories.includes(subcategory.id)}
                        onChange={() => handleSubcategoryToggle(subcategory.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                      <span className="text-sm text-gray-700">{subcategory.name}</span>
                  </label>
                ))}
                </div>
              )}
            </div>

            {/* Others Filter */}
            <div className="mb-6 sm:mb-8">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Others</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">In Stock Only</span>
                </label>
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm text-sm sm:text-base"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1">
          {filteredAndSortedProducts.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="text-gray-400 text-4xl sm:text-6xl mb-3 sm:mb-4">🔍</div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 mb-4 text-sm sm:text-base">Try adjusting your filters or search terms</p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 sm:gap-6">
              {filteredAndSortedProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewDetails={setSelectedProduct}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSignInRequired={onSignInRequired}
      />
    </div>
  );
};

export default ProductGrid;