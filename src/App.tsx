import { useState, useMemo, useRef, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { AuthProvider } from './contexts/AuthContext';
import Header from './components/Header';
import HeroSection from './components/HeroSection';
import FeaturedCategories from './components/FeaturedCategories';
import ProductGrid from './components/ProductGrid';
import Cart from './components/Cart';
import Wishlist from './components/Wishlist';
import CheckoutPage from './pages/CheckoutPage';
import PaymentCallback from './pages/PaymentCallback';
import PaymentTest from './components/PaymentTest';
import Footer from './components/Footer';
import Auth from './components/Auth';
import AllProducts from './pages/AllProducts';
import DealsPage from './pages/DealsPage';
import RoleGuard from './components/RoleGuard';
import AdminLayout from './components/admin/AdminLayout';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import Categories from './pages/admin/Categories';
import Orders from './pages/admin/Orders';
import Analytics from './pages/admin/Analytics';
import SubCategories from './pages/admin/SubCategories';
import Users from './pages/admin/Users';
import DeliveryLocations from './pages/admin/DeliveryLocations';
import DeliveryCosts from './pages/admin/DeliveryCosts';
import CategoryPage from './pages/CategoryPage';
import ProfilePage from './pages/ProfilePage';
import { Product } from './types';
import { supabase } from './lib/supabase';

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const navigate = useNavigate();
  
  // Ref for the featured products section
  const featuredProductsRef = useRef<HTMLDivElement>(null);

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

        console.log('[Debug] Database response:', { count: data?.length, firstProduct: data?.[0] });

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

        console.log('[Debug] Mapped products:', { count: mapped.length, firstProduct: mapped[0] });
        setProducts(mapped);
      } catch (error) {
        console.error('[Debug] Fetch error:', error);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by search query and category
    if (searchQuery || selectedCategory) {
      filtered = filtered.filter(product => {
        const matchesSearch = !searchQuery || 
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.category_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
          (product.subcategory_id || '').toLowerCase().includes(searchQuery.toLowerCase());

        const matchesCategory = !selectedCategory || product.category_id === selectedCategory;

        return matchesSearch && matchesCategory;
      });
    }

    // If no search or category filter, show featured products
    if (!searchQuery && !selectedCategory) {
      filtered = filtered.filter(product => product.is_featured);
    }

    return filtered;
  }, [searchQuery, selectedCategory, products]);

  const handleSearch = (query: string, categoryId: string | null) => {
    setSearchQuery(query);
    setSelectedCategory(categoryId);
  };

  const handleLogoClick = () => {
    // Reset all state
    setSearchQuery('');
    setSelectedCategory(null);
    // Navigate to home page
    navigate('/');
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getPageTitle = () => {
    if (searchQuery) return `Search Results for "${searchQuery}"`;
    if (selectedCategory) return `${selectedCategory} Products`;
    return "Featured Products";
  };

  const handleViewDealsClick = () => {
    navigate('/deals');
  };

  const handleSignInRequired = () => {
    setShowAuthModal(true);
  };

  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <div className="min-h-screen bg-gray-50">
            {/* Global Components - Available on all pages */}
            <Cart />
            <Wishlist />
            
            {/* Customer Routes */}
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/all-products" element={<AllProducts onSignInRequired={handleSignInRequired} />} />
              <Route path="/deals" element={<DealsPage onSignInRequired={handleSignInRequired} />} />
              <Route path="/category/:categorySlug" element={<CategoryPage onSignInRequired={handleSignInRequired} />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/payment/callback" element={<PaymentCallback />} />
              <Route path="/payment/test" element={<PaymentTest />} />
              <Route path="/" element={
                <>
                  <div className="fixed top-0 left-0 right-0 z-50">
                    <Header 
                      onSearch={handleSearch}
                      onLogoClick={handleLogoClick}
                      onViewDealsClick={() => navigate('/deals')}
                    />
                  </div>
                  
                  <div className="pt-0" style={{ paddingTop: 'var(--header-height, 0px)' }}>
                    {!searchQuery && !selectedCategory && (
                      <>
                        <HeroSection />
                        <FeaturedCategories />
                      </>
                    )}
                    
                    <div ref={featuredProductsRef} className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
                      {loadingProducts ? (
                        <div className="flex justify-center items-center py-8 sm:py-12">
                          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600"></div>
                        </div>
                      ) : (
                        <ProductGrid products={filteredProducts} title={getPageTitle()} onSignInRequired={handleSignInRequired} />
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-16 sm:mt-20 md:mt-24 lg:mt-32">
                    <Footer />
                  </div>
                  {showAuthModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                      <div className="bg-white rounded-2xl max-w-md w-full p-4 sm:p-6">
                        <Auth />
                        <button
                          onClick={() => setShowAuthModal(false)}
                          className="mt-4 w-full bg-gray-200 text-gray-800 py-2 rounded-lg hover:bg-gray-300"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </>
              } />
              <Route
                path="/profile"
                element={
                  <>
                    <div className="fixed top-0 left-0 right-0 z-50">
                      <Header
                        onSearch={handleSearch}
                        onLogoClick={handleLogoClick}
                        onViewDealsClick={() => navigate('/deals')}
                      />
                    </div>
                    <div style={{ paddingTop: 'var(--header-height, 0px)' }}>
                      <ProfilePage />
                    </div>
                  </>
                }
              />

              {/* Admin Routes */}
              <Route path="/admin" element={
                <RoleGuard allowedRoles={['admin', 'super_admin']}>
                  <AdminLayout />
                </RoleGuard>
              }>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="categories" element={<Categories />} />
                <Route path="subcategories" element={<SubCategories />} />
                <Route path="orders" element={<Orders />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="users" element={<Users />} />
                <Route path="delivery-locations" element={<DeliveryLocations />} />
                <Route path="delivery-costs" element={<DeliveryCosts />} />
              </Route>
            </Routes>
          </div>
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;