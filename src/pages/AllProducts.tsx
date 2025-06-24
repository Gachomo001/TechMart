import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import ProductModal from '../components/ProductModal';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';
import Wishlist from '../components/Wishlist';
import { Product } from '../types/index';
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
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
}

const AllProducts: React.FC<{ onSignInRequired?: () => void }> = ({ onSignInRequired }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sortBy, setSortBy] = useState('all');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Products from DB
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchParams] = useSearchParams();

  // Check for openProduct parameter and pending review data
  useEffect(() => {
    const openProductId = searchParams.get('openProduct');
    console.log('AllProducts: Checking for openProduct parameter:', openProductId);
    console.log('AllProducts: Current products count:', products.length);
    
    if (openProductId && products.length > 0) {
      const product = products.find(p => p.id === openProductId);
      console.log('AllProducts: Found product for openProduct:', product);
      
      if (product) {
        console.log('AllProducts: Setting selected product:', product.name);
        setSelectedProduct(product);
        
        // Check for pending review data
        const pendingReviewData = localStorage.getItem('pendingReview');
        console.log('AllProducts: Checking for pending review data:', pendingReviewData);
        
        if (pendingReviewData) {
          try {
            const pending = JSON.parse(pendingReviewData);
            console.log('AllProducts: Parsed pending review data:', pending);
            
            if (pending.productId === openProductId) {
              console.log('AllProducts: Found matching pending review, will be handled by ProductModal');
              // Don't clear here - let ProductModal handle it
            } else {
              console.log('AllProducts: Pending review product ID mismatch:', pending.productId, 'vs', openProductId);
            }
          } catch (error) {
            console.error('AllProducts: Error parsing pending review data:', error);
          }
        } else {
          console.log('AllProducts: No pending review data found');
        }
      } else {
        console.log('AllProducts: Product not found for ID:', openProductId);
      }
    } else {
      console.log('AllProducts: No openProduct parameter or products not loaded yet');
    }
  }, [searchParams, products]);

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

  // Fetch products from DB
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        console.log('[Debug] Starting product fetch');
        
        const { data, error } = await supabase
          .from('products')
          .select(`
            *,
            product_images(image_url, is_primary),
            subcategories!products_subcategory_id_fkey (
              id,
              name,
              slug
            )
          `);
          
        if (error) {
          console.error('[Debug] Database error:', error);
          setLoadingProducts(false);
          return;
        }

        // Fetch all reviews for all products
        const { data: reviews, error: reviewsError } = await supabase
          .from('reviews')
          .select('product_id, rating');
        if (reviewsError) {
          console.error('[Debug] Reviews fetch error:', reviewsError);
        }

        // Group reviews by product_id
        const ratingsByProduct: Record<string, number[]> = {};
        (reviews || []).forEach((r: { product_id: string; rating: number }) => {
          if (!ratingsByProduct[r.product_id]) ratingsByProduct[r.product_id] = [];
          ratingsByProduct[r.product_id].push(r.rating);
        });

        // Calculate average and count
        const productRatings: Record<string, { average: number; count: number }> = {};
        Object.entries(ratingsByProduct).forEach(([productId, ratingsArr]) => {
          const arr = ratingsArr as number[];
          const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
          productRatings[productId] = {
            average: avg,
            count: arr.length
          };
        });

        const mapped = (data || []).map((p: any) => {
          let image = p.image_url || '';
          if (Array.isArray(p.product_images) && p.product_images.length > 0) {
            const primary = p.product_images.find((img: any) => img.is_primary) || p.product_images[0];
            if (primary && primary.image_url) image = primary.image_url;
          }

          const stockLevel: 'high' | 'limited' | 'out' =
            (p.stock_quantity ?? 0) > 10
              ? 'high'
              : (p.stock_quantity ?? 0) > 0
                ? 'limited'
                : 'out';

          const mappedProduct: Product = {
            id: p.id,
            name: p.name,
            slug: p.slug,
            description: p.description,
            price: Number(p.price),
            buying_price: Number(p.buying_price),
            original_price: p.original_price ? Number(p.original_price) : null,
            category_id: p.category_id,
            subcategory_id: p.subcategory_id,
            image_url: image || '',
            stock_quantity: p.stock_quantity || 0,
            rating: productRatings[p.id]?.average || 0,
            review_count: productRatings[p.id]?.count || 0,
            is_featured: p.is_featured || false,
            is_bestseller: p.is_bestseller || false,
            specifications: p.specifications || {},
            created_at: p.created_at || new Date().toISOString(),
            updated_at: p.updated_at || new Date().toISOString(),
            product_images: p.product_images || [],
            image: image || undefined,
            category: p.category_id || undefined,
            subcategory: p.subcategories?.name || undefined,
            subcategoryId: p.subcategory_id || undefined,
            originalPrice: p.original_price ? Number(p.original_price) : undefined,
            inStock: (p.stock_quantity ?? 0) > 0 || undefined,
            featured: p.is_featured || undefined,
            bestseller: p.is_bestseller || undefined,
            stockLevel: stockLevel || undefined,
            reviewCount: productRatings[p.id]?.count || 0
          };

          return mappedProduct;
        });

        setProducts(mapped);

        // Set max price based on highest product price
        if (mapped.length > 0) {
          const highestPrice = Math.max(...mapped.map(p => p.price));
          const roundedMaxPrice = Math.ceil(highestPrice / 1000) * 1000;
          setPriceRange([0, roundedMaxPrice]);
          setMaxPrice(roundedMaxPrice.toString());
        }
      } catch (error) {
        console.error('[Debug] Fetch error:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

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
    console.log('[Debug] Filtering products:', { 
      total: products.length,
      filters: { sortBy, priceRange, categories: selectedCategories.length, subcategories: selectedSubcategories.length }
    });
    
    let filtered = products.filter((product) => {
      // Log each product's filter evaluation
      console.log('[Debug] Filtering product:', {
        name: product.name,
        price: product.price,
        category: product.category,
        subcategory: product.subcategory,
        subcategoryId: product.subcategoryId,
        inStock: product.inStock,
        priceRange: [priceRange[0], priceRange[1]],
        selectedCategories,
        selectedSubcategories,
        inStockOnly,
        searchQuery
      });

      const inPriceRange = product.price >= priceRange[0] && product.price <= priceRange[1];
      const inCategory = selectedCategories.length === 0 || (product.category && selectedCategories.includes(product.category));
      const inSubcategory = selectedSubcategories.length === 0 || (product.subcategoryId && selectedSubcategories.includes(product.subcategoryId));
      const stockFilter = !inStockOnly || product.inStock;
      const searchFilter = !searchQuery || 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      const passes = inPriceRange && inCategory && inSubcategory && stockFilter && searchFilter;
      console.log('[Debug] Product filter result:', { name: product.name, passes });
      
      return passes;
    });

    // Sort the filtered products
    switch (sortBy) {
      case 'all':
        // No sorting needed, just return filtered products
        break;
      case 'featured':
        filtered = filtered.filter(product => product.featured);
        break;
      case 'newest':
        // Sort by created_at in descending order (newest first)
        filtered.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
        break;
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
    }

    console.log('[Debug] Filtered and sorted products:', { count: filtered.length, firstProduct: filtered[0] });
    return filtered;
  }, [sortBy, priceRange, selectedCategories, selectedSubcategories, inStockOnly, searchQuery, products]);

  // Define hasActiveFilters once
  const hasActiveFilters = selectedCategories.length > 0 || 
    selectedSubcategories.length > 0 || 
    priceRange[0] > 0 || 
    priceRange[1] < priceRange[1] ||
    inStockOnly ||
    searchQuery;

  // Add logging for render state
  console.log('[Debug] Render state:', {
    loadingProducts,
    productsCount: products.length,
    filteredProductsCount: filteredAndSortedProducts.length,
    sortBy,
    hasActiveFilters
  });

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
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header 
          onSearch={setSearchQuery}
          onCategorySelect={(category) => setSelectedCategories([category])}
          onLogoClick={() => window.location.href = '/'}
          onViewDealsClick={() => window.location.href = '/all-products'}
        />
      </div>
      {loadingProducts ? (
        <div className="flex justify-center items-center min-h-screen">Loading products...</div>
      ) : (
        <>
          <div className="pt-48">
            <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
              <div className="flex gap-8">
                {/* Filters Sidebar */}
                <div className={`w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                  <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-6 pb-4 border-b border-gray-200">Filters</h2>
                    
                    {/* Price Range Filter */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Price Range</h3>
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label htmlFor="minPrice" className="block text-sm text-gray-600 mb-1">Min Price (KES)</label>
                            <input
                              type="number"
                              id="minPrice"
                              value={minPrice}
                              onChange={(e) => handlePriceChange('min', e.target.value)}
                              placeholder="0"
                              min="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label htmlFor="maxPrice" className="block text-sm text-gray-600 mb-1">Max Price (KES)</label>
                            <input
                              type="number"
                              id="maxPrice"
                              value={maxPrice}
                              onChange={(e) => handlePriceChange('max', e.target.value)}
                              placeholder={maxPrice}
                              min="0"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Categories Filter */}
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
                      {isLoading ? (
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
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
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Subcategories</h3>
                      {isLoading ? (
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
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
                    <div className="mb-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Others</h3>
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
                        className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold shadow-sm"
                      >
                        Clear All Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 pb-24">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
                      <p className="text-gray-600">
                        Showing {filteredAndSortedProducts.length} of {products.length} products
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors lg:hidden"
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
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="all">All Products</option>
                        <option value="featured">Featured</option>
                        <option value="newest">Newest</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="rating">Highest Rated</option>
                        <option value="name">Name: A to Z</option>
                      </select>
                    </div>
                  </div>

                  {/* Products Grid */}
                  {(() => {
                    console.log('[Debug] Rendering grid with products:', filteredAndSortedProducts.length);
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-16">
                        {filteredAndSortedProducts.map(product => {
                          console.log('[Debug] Rendering product card:', product.name);
                          return <ProductCard
                            key={product.id}
                            product={product}
                            onViewDetails={setSelectedProduct}
                          />;
                        })}
                      </div>
                    );
                  })()}

                  {filteredAndSortedProducts.length === 0 && (
                    <div className="text-center py-12 mb-64">
                      <div className="text-gray-400 text-6xl mb-4">🔍</div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                      <p className="text-gray-600 mb-4">Try adjusting your filters or search terms</p>
                      {hasActiveFilters && (
                        <button
                          onClick={clearAllFilters}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Footer />
          <Cart />
          <Wishlist />
          <ProductModal
            product={selectedProduct}
            isOpen={!!selectedProduct}
            onClose={() => setSelectedProduct(null)}
            onSignInRequired={onSignInRequired}
          />
        </>
      )}
    </div>
  );
};

export default AllProducts; 