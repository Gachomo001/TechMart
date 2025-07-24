import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { productId } = await req.json();

    if (!productId) {
      return new Response(JSON.stringify({ error: 'productId is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // First, get the image URLs from the product_images table
    const { data: images, error: imagesError } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', productId);

    if (imagesError) {
      console.error('Error fetching product images:', imagesError);
      throw imagesError;
    }

    // Also get the primary image_url from the products table
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('image_url')
      .eq('id', productId)
      .single();

    if (productError) {
      console.error('Error fetching product:', productError);
      throw productError;
    }

    const imageUrls = images.map(img => img.image_url);
    if (product && product.image_url) {
      imageUrls.push(product.image_url);
    }

    // Extract file paths from URLs
    const filePaths = imageUrls
      .map(url => {
        try {
          const urlObject = new URL(url);
          // The path is usually after '/storage/v1/object/public/products/'
          const path = urlObject.pathname.split('/products/')[1];
          return path ? `products/${path}` : null;
        } catch (e) {
          console.error(`Invalid URL: ${url}`, e);
          return null;
        }
      })
      .filter(path => path !== null) as string[];
      
    // Delete images from storage
    if (filePaths.length > 0) {
        // Supabase storage expects just the path after the bucket name
        const simplifiedFilePaths = filePaths.map(p => p.replace('products/', ''));
        const { error: storageError } = await supabase.storage
            .from('products')
            .remove(simplifiedFilePaths);

        if (storageError) {
            console.error('Error deleting images from storage:', storageError);
            // We can choose to continue even if image deletion fails
        }
    }


    // Delete from product_images table
    const { error: productImageError } = await supabase
      .from('product_images')
      .delete()
      .eq('product_id', productId);

    if (productImageError) {
      console.error('Error deleting from product_images:', productImageError);
      throw productImageError;
    }

    // Finally, delete the product itself
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (deleteError) {
      console.error('Error deleting product:', deleteError);
      throw deleteError;
    }

    return new Response(JSON.stringify({ message: 'Product and associated images deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
