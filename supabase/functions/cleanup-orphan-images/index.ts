// To resolve TypeScript errors in your editor, please ensure you have the Deno extension installed
// and have enabled linting and type-checking for this workspace.
// For more information, see: https://deno.com/manual/getting_started/setup_your_environment
/// <reference types="https://deno.land/x/deno/cli/types/deno.d.ts" />
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. List all files in the 'products' storage bucket
    const { data: bucketFiles, error: listError } = await supabase.storage.from('products').list();
    if (listError) throw listError;

    const bucketFileNames = new Set(bucketFiles.map(file => file.name));

    // 2. Get all image_url values from the database
    const { data: productImages, error: productImagesError } = await supabase
      .from('product_images')
      .select('image_url');
    if (productImagesError) throw productImagesError;

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('image_url');
    if (productsError) throw productsError;

    const dbImageUrls = new Set([
      ...productImages.map(img => img.image_url),
      ...products.map(p => p.image_url).filter(url => url)
    ]);

    // 3. Compare and find orphans
    const dbFileNames = new Set<string>();
    for (const url of dbImageUrls) {
        try {
            const urlObject = new URL(url);
            const pathSegments = urlObject.pathname.split('/');
            const fileName = pathSegments.pop();
            if (fileName) {
                dbFileNames.add(decodeURIComponent(fileName));
            }
        } catch (e) {
            console.error(`Invalid URL in database: ${url}`, e);
        }
    }

    const orphanedFiles = [...bucketFileNames].filter(fileName => !dbFileNames.has(fileName));

    // 4. Delete orphaned files
    if (orphanedFiles.length > 0) {
      const { data: deleteData, error: deleteError } = await supabase.storage
        .from('products')
        .remove(orphanedFiles);
      
      if (deleteError) {
        console.error('Error deleting orphaned files:', deleteError);
        throw deleteError;
      }
      
      return new Response(JSON.stringify({ message: 'Orphaned images cleaned up successfully', deletedFiles: deleteData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ message: 'No orphaned images found' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
