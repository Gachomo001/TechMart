import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration for footer links API');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('footer_links')
        .select('*')
        .order('category', { ascending: true })
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Error fetching footer links:', error);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch footer links'
        });
      }

      // Group links by category
      const groupedLinks = {};
      data?.forEach(link => {
        if (!groupedLinks[link.category]) {
          groupedLinks[link.category] = [];
        }
        groupedLinks[link.category].push({
          title: link.title,
          url: link.url,
          is_external: link.is_external
        });
      });

      res.json({
        success: true,
        data: groupedLinks
      });

    } catch (error) {
      console.error('Error in footer links fetch:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  } else {
    res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }
}
