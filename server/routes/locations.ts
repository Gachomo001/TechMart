import { Router } from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), '../../.env') });

export const locationsRouter = Router();

// Explicit return type to avoid '{}' inference on errors
type SupabaseInit = { client: SupabaseClient | null; error: Error | null };

// Initialize Supabase client with better error handling
const getSupabaseClient = (): SupabaseInit => {
  console.log('\n=== Initializing Supabase Client ===');
  
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  console.log('Supabase URL:', supabaseUrl ? '***SET***' : 'MISSING');
  console.log('Supabase Key:', supabaseKey ? '***SET***' : 'MISSING');

  if (!supabaseUrl || !supabaseKey) {
    const error = new Error('Missing Supabase configuration');
    console.error('❌ Error:', error.message);
    console.error('VITE_SUPABASE_URL:', supabaseUrl ? '***SET***' : 'MISSING');
    console.error('VITE_SUPABASE_ANON_KEY:', supabaseKey ? '***SET***' : 'MISSING');
    return { client: null, error };
  }

  try {
    console.log('Creating Supabase client...');
    const client = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });
    console.log('✅ Supabase client created successfully');
    return { client, error: null };
  } catch (err) {
    console.error('❌ Failed to create Supabase client:', err);
    const e = err instanceof Error ? err : new Error(String(err));
    return { client: null, error: e };
  }
};

const { client: supabase, error: initError } = getSupabaseClient();

// Health check endpoint with detailed status
locationsRouter.get('/health', (req, res) => {
  try {
    const status = {
      service: 'Locations Service',
      status: 'running',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      supabase: {
        initialized: !!supabase,
        error: initError ? initError.message : null,
        url: process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL ? '***SET***' : 'MISSING',
        key: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ? '***SET***' : 'MISSING'
      },
      environmentVariables: {
        NODE_ENV: process.env.NODE_ENV,
        VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? '***SET***' : 'MISSING',
        VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY ? '***SET***' : 'MISSING',
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? '***SET***' : 'MISSING',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '***SET***' : 'MISSING'
      }
    };

    const statusCode = status.supabase.initialized ? 200 : 503;
    res.status(statusCode).json(status);
  } catch (err) {
    console.error('❌ Health check failed:', err);
    const e = err instanceof Error ? err : new Error(String(err));
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: e.message,
      stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
});

// Simple test endpoint
locationsRouter.get('/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Locations test endpoint is working',
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsage: process.memoryUsage()
  });
});

// Get locations by type (county or region)
locationsRouter.get('/', async (req, res) => {
  // Check if Supabase is properly initialized
  if (!supabase || initError) {
    console.error('❌ Supabase not initialized:', initError?.message || 'Unknown error');
    return res.status(500).json({
      status: 'error',
      message: 'Server configuration error',
      details: 'Database connection not properly initialized.',
      error: initError ? initError.message : 'Supabase client is null',
      config: {
        hasUrl: !!(process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
        hasKey: !!(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)
      }
    });
  }

  try {
    const { type } = req.query;
    
    // Validate type parameter
    if (type !== 'county' && type !== 'region') {
      return res.status(400).json({ 
        status: 'error',
        message: 'Invalid location type',
        details: 'Type must be either "county" or "region"'
      });
    }

    console.log(`🔍 Fetching ${type} locations from database...`);
    
    // Query the database with more detailed logging
    console.log(`🔍 Executing query for type: ${type}`);
    

    // First, let's do a simple count to verify the table has data
    console.log('Running count query with filters:', { type, is_active: true });
    
    
    const { count, error: countError } = await supabase
      .from('locations')
      .select('*', { count: 'exact', head: true })
      .eq('type', type);

    if (countError) {
      console.error('❌ Count query error:', countError);
      throw new Error(`Failed to count locations: ${countError.message}`);
    }

    console.log(`ℹ️ Found ${count || 0} active ${type} locations`);

    // Now get the actual data
    let query = supabase
      .from('locations')
      .select('*')
      .eq('type', type)
      .order('name');

    const { data, error } = await query;

    if (error) {
      console.error('❌ Query error:', error);
      throw new Error(`Failed to fetch locations: ${error.message}`);
    }

    if (!data || data.length === 0) {
      console.warn(`⚠️ No ${type} locations found`);
      return res.status(404).json({
        status: 'success',
        message: `No ${type} locations found`,
        data: [],
        total_locations: 0
      });
    }

    console.log(`✅ Successfully retrieved ${data.length} ${type} locations`);
    
    const response = {
      status: 'success',
      data: data,
      total_locations: count || 0,
      query: {
        table: 'locations',
        filters: { type, is_active: true },
        order: 'name ASC'
      }
    };
    
    console.log('📤 Sending response:', JSON.stringify({
      ...response,
      data: Array.isArray(response.data) ? `[${response.data.length} items]` : response.data
    }, null, 2));
    
    res.json(response);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Unexpected error in locations endpoint:', error);
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    
    return res.status(500).json({ 
      status: 'error',
      message: 'Internal server error',
      details: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
});

export default locationsRouter;
