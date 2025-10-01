import { createClient } from '@supabase/supabase-js';

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing environment variables:');
  console.error('VITE_SUPABASE_URL:', !!process.env.VITE_SUPABASE_URL);
  console.error('VITE_SUPABASE_ANON_KEY:', !!process.env.VITE_SUPABASE_ANON_KEY);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  throw new Error('Missing Supabase environment variables');
}

// Client for user-authenticated requests
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Admin client for server-side operations (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
