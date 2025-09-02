import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from './ProductCard';
import { Product } from '../types';
import { supabase } from '../lib/supabase';
import ProductModal from './ProductModal';

interface HotDealsProps {
  onSignInRequired?: () => void;
}

const HotDeals: React.FC<HotDealsProps> = ({ onSignInRequired }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  useEffect(() => {
    const fetchHotDeals = async () => {
      try {
        setLoading(true);
        
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
          .order('created_at', { ascending: false })
          .limit(8); // Limit to 8 products (2 rows of 4)
          
        if (error) throw error;

        // Fetch all reviews for all products
        const { data: reviews } = await supabase
          .from('reviews')
          .select('product_id, rating');

        // Group reviews by product_id
        const ratingsByProduct: Record<string, number[]> = {};
        (reviews || []).forEach((r: { product_id: string; rating: number }) => {
          if (!ratingsByProduct[r.product_id]) ratingsByProduct[r.product_id] = [];
          ratingsByProduct[r.product_id].push(r.rating);
        });

        // Calculate average and count
        const productRatings: Record<string, { average: number; count: number }> = {};
        Object.entries(ratingsByProduct).forEach(([productId, ratingsArr]) => {
          const avg = ratingsArr.reduce((a, b) => a + b, 0) / ratingsArr.length;
          productRatings[productId] = {
            average: avg,
            count: ratingsArr.length
          };
        });

        const mapped = (data || []).map((p: any) => {
          let image = p.image_url || '';
          if (Array.isArray(p.product_images) && p.product_images.length > 0) {
            const primary = p.product_images.find((img: any) => img.is_primary) || p.product_images[0];
            if (primary?.image_url) image = primary.image_url;
          }

          const stockLevel: 'high' | 'limited' | 'out' =
            (p.stock_quantity ?? 0) > 10 ? 'high' :
            (p.stock_quantity ?? 0) > 0 ? 'limited' : 'out';

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
            image_url: image,
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
            image,
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

        setProducts(mapped);
      } catch (error) {
        console.error('Error fetching hot deals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHotDeals();
  }, []);

  if (loading) {
    return (
      <section className="pt-6 pb-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Hot Deals</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Don't miss out on these amazing discounts for a limited time only
            </p>
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null; // Don't render anything if there are no deals
  }

  return (
    <section className="pt-6 pb-12 bg-white">
      <div className="w-full px-2 sm:px-4 lg:px-6 xl:px-8 2xl:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">Hot Deals</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Don't miss out on these amazing discounts for a limited time only
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto px-4 sm:px-6">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onViewDetails={setSelectedProduct}
              />
            ))}
          </div>
        </div>

        <div className="mt-10 text-center">
          <button
            onClick={() => navigate('/deals')}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            View All Deals
            <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onSignInRequired={onSignInRequired}
      />
    </section>
  );
};

export default HotDeals;
