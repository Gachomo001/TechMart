import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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

const CategoryPage: React.FC<{ onSignInRequired?: () => void }> = ({ onSignInRequired }) => {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 0]);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Check for openProduct parameter and pending review data
  useEffect(() => {
    const openProductId = searchParams.get('openProduct');
    console.log('CategoryPage: Checking for openProduct parameter:', openProductId);
    console.log('CategoryPage: Current products count:', products.length);
    
    if (openProductId && products.length > 0) {
      const product = products.find(p => p.id === openProductId);
      console.log('CategoryPage: Found product for openProduct:', product);
      
      if (product) {
        console.log('CategoryPage: Setting selected product:', product.name);
        setSelectedProduct(product);
        
        // Check for pending review data
        const pendingReviewData = localStorage.getItem('pendingReview');
        console.log('CategoryPage: Checking for pending review data:', pendingReviewData);
        
        if (pendingReviewData) {
          try {
            const pending = JSON.parse(pendingReviewData);
            console.log('CategoryPage: Parsed pending review data:', pending);
            
            if (pending.productId === openProductId) {
              console.log('CategoryPage: Found matching pending review, will be handled by ProductModal');
              // Don't clear here - let ProductModal handle it
            } else {
              console.log('CategoryPage: Pending review product ID mismatch:', pending.productId, 'vs', openProductId);
            }
          } catch (error) {
            console.error('CategoryPage: Error parsing pending review data:', error);
          }
        } else {
          console.log('CategoryPage: No pending review data found');
        }
      } else {
        console.log('CategoryPage: Product not found for ID:', openProductId);
      }
    } else {
      console.log('CategoryPage: No openProduct parameter or products not loaded yet');
    }
  }, [searchParams, products]);

  // Fetch category, subcategories, and products
  useEffect(() => {
    // Scroll to top when the page loads
    window.scrollTo(0, 0);

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch category
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('slug', categorySlug)
          .single();

        if (categoryError) throw categoryError;
        if (!categoryData) {
          navigate('/');
          return;
        }
        setCategory(categoryData);

        // Fetch subcategories for this category
        const { data: subcategoriesData, error: subcategoriesError } = await supabase
          .from('subcategories')
          .select('*')
          .eq('category_id', categoryData.id)
          .order('name');

        if (subcategoriesError) throw subcategoriesError;
        setSubcategories(subcategoriesData || []);

        // Fetch products for this category
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select(`
            *,
            product_images(image_url, is_primary),
            subcategories!products_subcategory_id_fkey (
              id,
              name,
              slug
            )
          `)
          .eq('category_id', categoryData.id);

        if (productsError) throw productsError;

        // Fetch all reviews for all products in this category
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

        const mappedProducts = (productsData || []).map((p: any) => {
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

          return {
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
            // UI computed properties
            image: image || '',
            category: p.category_id || '',
            subcategory: p.subcategories?.name || '',
            subcategoryId: p.subcategory_id || '',
            originalPrice: p.original_price ? Number(p.original_price) : undefined,
            inStock: (p.stock_quantity ?? 0) > 0,
            featured: p.is_featured || false,
            bestseller: p.is_bestseller || false,
            stockLevel,
            reviewCount: productRatings[p.id]?.count || 0
          };
        });

        setProducts(mappedProducts);

        // Set max price based on highest product price
        if (mappedProducts.length > 0) {
          const highestPrice = Math.max(...mappedProducts.map(p => p.price));
          const roundedMaxPrice = Math.ceil(highestPrice / 1000) * 1000;
          setPriceRange([0, roundedMaxPrice]);
          setMaxPrice(roundedMaxPrice.toString());
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [categorySlug, navigate]);

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = products;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((product.subcategory_id as string) || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by price range
    filtered = filtered.filter(product =>
      product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    // Filter by subcategories
    if (selectedSubcategories.length > 0) {
      filtered = filtered.filter(product =>
        product.subcategory_id && selectedSubcategories.includes(product.subcategory_id)
      );
    }

    // Filter by stock status
    if (inStockOnly) {
      filtered = filtered.filter(product => product.stock_quantity > 0);
    }

    // Sort products
    switch (sortBy) {
      case 'newest':
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
  }, [products, searchQuery, priceRange, selectedSubcategories, inStockOnly, sortBy]);

  const handleSubcategoryToggle = (subcategoryId: string) => {
    setSelectedSubcategories(prev =>
      prev.includes(subcategoryId)
        ? prev.filter(id => id !== subcategoryId)
        : [...prev, subcategoryId]
    );
  };

  const clearAllFilters = () => {
    setSelectedSubcategories([]);
    setPriceRange([0, Number(maxPrice)]);
    setMinPrice('');
    setMaxPrice(maxPrice);
    setInStockOnly(false);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedSubcategories.length > 0 || 
    priceRange[0] > 0 || 
    priceRange[1] < Number(maxPrice) ||
    inStockOnly ||
    searchQuery;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header 
          onSearch={setSearchQuery}
          onLogoClick={() => navigate('/')}
          onViewDealsClick={() => navigate('/deals')}
        />
        <div className="flex justify-center items-center min-h-screen pt-32">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!category) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        onSearch={setSearchQuery}
        onLogoClick={() => navigate('/')}
        onViewDealsClick={() => navigate('/deals')}
      />

      <main className="pt-16 lg:pt-2 pb-16">
        <div className="max-w-[1440px] mx-auto px-6 sm:px-8 lg:px-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <div className={`w-full lg:w-64 flex-shrink-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
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
                          onChange={(e) => {
                            const value = e.target.value;
                            setMinPrice(value);
                            setPriceRange([Number(value) || 0, priceRange[1]]);
                          }}
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
                          onChange={(e) => {
                            const value = e.target.value;
                            setMaxPrice(value);
                            setPriceRange([priceRange[0], Number(value) || 0]);
                          }}
                          placeholder={maxPrice}
                          min="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subcategories Filter */}
                {subcategories.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Subcategories</h3>
                    <div className="space-y-2">
                      {subcategories.map(subcategory => (
                        <label key={subcategory.id} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={selectedSubcategories.includes(subcategory.id)}
                            onChange={() => handleSubcategoryToggle(subcategory.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-gray-700">{subcategory.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Others Filter */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Others</h3>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-700">In Stock Only</span>
                  </label>
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

            {/* Products Grid */}
            <div className="flex-1">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{category.name}</h1>
                  <p className="text-gray-600 mt-2">
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
                    <option value="featured">Featured</option>
                    <option value="newest">Newest</option>
                    <option value="price-low">Price: Low to High</option>
                    <option value="price-high">Price: High to Low</option>
                    <option value="rating">Highest Rated</option>
                    <option value="name">Name: A to Z</option>
                  </select>
                </div>
              </div>

              {filteredAndSortedProducts.length === 0 ? (
                <div className="text-center py-12">
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
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
        </div>
      </main>

      <Footer />
      <Cart />
      <Wishlist />
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSignInRequired={onSignInRequired}
      />
    </div>
  );
};

export default CategoryPage; 