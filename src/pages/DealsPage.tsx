import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProductGrid from '../components/ProductGrid';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Cart from '../components/Cart';
import Wishlist from '../components/Wishlist';
import { Product } from '../types';
import { supabase } from '../lib/supabase';

interface DealsPageProps {
  onSignInRequired?: () => void;
}

const DealsPage: React.FC<DealsPageProps> = ({ onSignInRequired }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDealsProducts = async () => {
      try {
        setLoading(true);
        console.log('[Debug] Starting deals products fetch');
        
        // Fetch products that have original_price (discounted products)
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
          `)
          .not('original_price', 'is', null)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('[Debug] Database error:', error);
          setLoading(false);
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

        console.log('[Debug] Mapped deals products:', { count: mapped.length, firstProduct: mapped[0] });
        setProducts(mapped);
      } catch (error) {
        console.error('[Debug] Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDealsProducts();
  }, []);

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleSearch = (query: string, categoryId: string | null) => {
    // Navigate to home page with search parameters
    navigate('/', { state: { searchQuery: query, categoryId } });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="fixed top-0 left-0 right-0 z-50">
        <Header 
          onSearch={handleSearch}
          onLogoClick={handleLogoClick}
          onViewDealsClick={() => navigate('/deals')}
        />
      </div>
      
      <div className="pt-0" style={{ paddingTop: 'var(--header-height, 0px)' }}>
        {/* Page Content */}
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
          {/* Page Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Today's Deals
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              Discover amazing discounts on premium computer products. Limited time offers on laptops, 
              desktops, components, and accessories.
            </p>
          </div>

          {/* Deals Banner */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-6 sm:p-8 mb-8 sm:mb-12 text-white">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="text-center sm:text-left mb-4 sm:mb-0">
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">🔥 Hot Deals Alert!</h2>
                <p className="text-orange-100">
                  Save big on selected items. Prices won't last long!
                </p>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-3xl sm:text-4xl font-bold mb-1">
                  {products.length}
                </div>
                <div className="text-orange-100 text-sm sm:text-base">
                  Products on Sale
                </div>
              </div>
            </div>
          </div>

          {/* Products Grid */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <ProductGrid 
              products={products} 
              title="Deals & Discounts" 
              onSignInRequired={onSignInRequired} 
            />
          )}

          {/* Empty State */}
          {!loading && products.length === 0 && (
            <div className="text-center py-16">
              <div className="text-gray-400 text-6xl mb-4">🏷️</div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-2">No Deals Available</h3>
              <p className="text-gray-600 mb-6">
                Check back later for amazing deals and discounts!
              </p>
              <button
                onClick={handleLogoClick}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Browse All Products
              </button>
            </div>
          )}
        </div>
        
        {/* Add spacing above footer */}
        <div className="mt-16 sm:mt-20 md:mt-24 lg:mt-32">
          <Footer />
        </div>
        <Cart />
        <Wishlist />
      </div>
    </div>
  );
};

export default DealsPage; 