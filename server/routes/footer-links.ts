import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const router = Router();

// Middleware to authenticate and get user from Supabase
const authenticateUser = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.error('Token verification failed:', error);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile fetch failed:', profileError);
      return res.status(403).json({ error: 'User profile not found' });
    }

    req.user = { ...user, profile };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to require admin role
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.user || !req.user.profile || !['admin', 'super_admin'].includes(req.user.profile.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get all active footer links (public endpoint)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('footer_links')
      .select('*')
      .eq('is_active', true)
      .order('section_name')
      .order('order_index');

    if (error) {
      console.error('Error fetching footer links:', error);
      return res.status(500).json({ error: 'Failed to fetch footer links' });
    }

    // Group links by section
    const groupedLinks = data.reduce((acc: any, link: any) => {
      if (!acc[link.section_name]) {
        acc[link.section_name] = [];
      }
      acc[link.section_name].push(link);
      return acc;
    }, {});

    res.json(groupedLinks);
  } catch (error) {
    console.error('Error in GET /footer-links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all footer links for admin (including inactive)
router.get('/admin', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    // Use the authenticated user's token for RLS
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    const supabaseWithAuth = supabase.auth.admin || supabase;
    
    const { data, error } = await supabase
      .from('footer_links')
      .select('*')
      .order('section_name')
      .order('order_index');

    if (error) {
      console.error('Error fetching admin footer links:', error);
      return res.status(500).json({ error: 'Failed to fetch footer links' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in GET /footer-links/admin:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new footer link
router.post('/', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const { section_name, title, url, order_index, opens_in_new_tab } = req.body;

    if (!section_name || !title || !url) {
      return res.status(400).json({ 
        error: 'Missing required fields: section_name, title, url' 
      });
    }

    // Get the auth token and create an authenticated supabase client
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    // Create a new supabase client with the user's token
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }
    
    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data, error } = await userSupabase
      .from('footer_links')
      .insert({
        section_name: section_name.trim(),
        title: title.trim(),
        url: url.trim(),
        order_index: order_index || 0,
        opens_in_new_tab: opens_in_new_tab || false,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating footer link:', error);
      return res.status(500).json({ error: 'Failed to create footer link' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error in POST /footer-links:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update footer link
router.put('/:id', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { section_name, title, url, order_index, is_active, opens_in_new_tab } = req.body;

    const updateData: any = {};
    if (section_name !== undefined) updateData.section_name = section_name.trim();
    if (title !== undefined) updateData.title = title.trim();
    if (url !== undefined) updateData.url = url.trim();
    if (order_index !== undefined) updateData.order_index = order_index;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (opens_in_new_tab !== undefined) updateData.opens_in_new_tab = opens_in_new_tab;

    // Get the auth token and create an authenticated supabase client
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }
    
    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { data, error } = await userSupabase
      .from('footer_links')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating footer link:', error);
      return res.status(500).json({ error: 'Failed to update footer link' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Footer link not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in PUT /footer-links/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete footer link
router.delete('/:id', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;

    // Get the auth token and create an authenticated supabase client
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }
    
    const userSupabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    });

    const { error } = await userSupabase
      .from('footer_links')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting footer link:', error);
      return res.status(500).json({ error: 'Failed to delete footer link' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error in DELETE /footer-links/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get unique section names
router.get('/sections', authenticateUser, requireAdmin, async (req: any, res) => {
  try {
    const { data, error } = await supabase
      .from('footer_links')
      .select('section_name')
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching sections:', error);
      return res.status(500).json({ error: 'Failed to fetch sections' });
    }

    const uniqueSections = [...new Set(data.map(item => item.section_name))];
    res.json(uniqueSections);
  } catch (error) {
    console.error('Error in GET /footer-links/sections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
