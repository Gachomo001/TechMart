import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import ProductModal from './ProductModal';
import { Product } from '../types/index';

const ProductModalHandler: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleProductParam = async () => {
      const params = new URLSearchParams(location.search);
      const productId = params.get('product');
      
      if (productId && productId !== selectedProduct?.id) {
        setIsLoading(true);
        try {
          // Fetch the product from database
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
            .eq('id', productId)
            .single();

          if (error) {
            console.error('Error fetching product:', error);
            // Remove invalid product param from URL
            navigate({ pathname: location.pathname, search: '' }, { replace: true });
            return;
          }

          if (data) {
            // Fetch reviews for this product
            const { data: reviews, error: reviewsError } = await supabase
              .from('reviews')
              .select('rating')
              .eq('product_id', productId);

            let rating = 0;
            let reviewCount = 0;
            
            if (!reviewsError && reviews) {
              reviewCount = reviews.length;
              if (reviewCount > 0) {
                rating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount;
              }
            }

            // Map the product data to match the Product interface
            let image = data.image_url || '';
            if (Array.isArray(data.product_images) && data.product_images.length > 0) {
              const primary = data.product_images.find((img: any) => img.is_primary) || data.product_images[0];
              if (primary && primary.image_url) image = primary.image_url;
            }

            const stockLevel: 'high' | 'limited' | 'out' =
              (data.stock_quantity ?? 0) > 10
                ? 'high'
                : (data.stock_quantity ?? 0) > 0
                  ? 'limited'
                  : 'out';

            const product: Product = {
              id: data.id,
              name: data.name,
              slug: data.slug,
              description: data.description,
              price: Number(data.price),
              buying_price: Number(data.buying_price),
              original_price: data.original_price ? Number(data.original_price) : null,
              category_id: data.category_id,
              subcategory_id: data.subcategory_id,
              image_url: image,
              stock_quantity: data.stock_quantity || 0,
              rating: rating,
              review_count: reviewCount,
              is_featured: data.is_featured || false,
              is_bestseller: data.is_bestseller || false,
              specifications: data.specifications || {},
              created_at: data.created_at || new Date().toISOString(),
              updated_at: data.updated_at || new Date().toISOString(),
              product_images: data.product_images || [],
              // UI computed properties
              image: image,
              category: data.category_id || '',
              subcategory: data.subcategories?.name || '',
              subcategoryId: data.subcategory_id || '',
              originalPrice: data.original_price ? Number(data.original_price) : undefined,
              inStock: (data.stock_quantity ?? 0) > 0,
              featured: data.is_featured || false,
              bestseller: data.is_bestseller || false,
              stockLevel,
              reviewCount: reviewCount
            };

            setSelectedProduct(product);
          }
        } catch (error) {
          console.error('Error fetching product:', error);
          // Remove invalid product param from URL
          navigate({ pathname: location.pathname, search: '' }, { replace: true });
        } finally {
          setIsLoading(false);
        }
      } else if (!productId && selectedProduct) {
        // No product param but we have a selected product, clear it
        setSelectedProduct(null);
      }
    };

    handleProductParam();
  }, [location.search, navigate, location.pathname, selectedProduct?.id]);

  const handleCloseModal = () => {
    setSelectedProduct(null);
    // Remove product param from URL
    navigate({ pathname: location.pathname, search: '' }, { replace: true });
  };

  return (
    <>
      {/* Loading indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span>Loading product...</span>
          </div>
        </div>
      )}
      
      {/* Product Modal */}
      <ProductModal
        product={selectedProduct}
        isOpen={!!selectedProduct}
        onClose={handleCloseModal}
      />
    </>
  );
};

export default ProductModalHandler;
