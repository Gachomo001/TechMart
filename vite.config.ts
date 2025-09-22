import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    // Explicitly define environment variables for production builds
    define: {
      // Ensure environment variables are available in production
      __VITE_INTASEND_PUBLISHABLE_KEY__: JSON.stringify(env.VITE_INTASEND_PUBLISHABLE_KEY),
      __VITE_SUPABASE_URL__: JSON.stringify(env.VITE_SUPABASE_URL),
      __VITE_SUPABASE_ANON_KEY__: JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
          ws: true,
          // Configure CORS headers
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.error('Proxy error:', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Proxying request:', req.method, req.url, '->', proxyReq.path);
              // Add any necessary headers here
              proxyReq.setHeader('x-added', 'foobar');
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              proxyRes.headers['Access-Control-Allow-Origin'] = req.headers.origin || '*';
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
              proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
              proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
            });
          }
        },
      },
    },
  };
});
