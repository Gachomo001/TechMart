import express from 'express';
import { mpesaRouter } from './routes/mpesa.js';

const app = express();

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Basic middleware
app.use(express.json());

// Log all registered routes
function printRoutes(app) {
  console.log('\n=== REGISTERED ROUTES ===');
  
  // Safe way to access router stack
  const routerStack = app._router?.stack || [];
  
  routerStack.forEach((layer) => {
    // Skip if not a route or router
    if (!layer) return;
    
    // Handle direct routes
    if (layer.route) {
      const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
      console.log(`${methods.padEnd(6)} ${layer.route.path}`);
    } 
    // Handle router instances
    else if (layer.name === 'router' || layer.name === 'bound dispatch') {
      let prefix = 'path';
      try {
        // Just show the raw regex if we can't parse it cleanly
        prefix = layer.regexp.toString();
      } catch (e) {
        prefix = 'unable-to-parse';
      }
      
      console.log(`\nRouter: ${prefix}`);
      
      // Check if this router has routes
      if (layer.handle?.stack) {
        layer.handle.stack.forEach((route) => {
          if (route?.route?.path) {
            const methods = route.route.methods 
              ? Object.keys(route.route.methods).join(',').toUpperCase() 
              : 'UNKNOWN';
            console.log(`  ${methods.padEnd(6)} ${route.route.path}`);
          }
        });
      }
    }
  });
  
  console.log('========================\n');
}

// Test route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Mount MPESA router with error handling
try {
  console.log('Attempting to mount MPESA router...');
  app.use('/api/payment/mpesa', mpesaRouter);
  console.log('✅ MPESA router mounted successfully');
} catch (error) {
  console.error('❌ Failed to mount MPESA router:', error);
  process.exit(1);
}

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Minimal server running on port ${PORT}`);
  console.log('Try these endpoints:');
  console.log('- http://localhost:3000/api/health');
  console.log('- http://localhost:3000/api/payment/mpesa/test');
  
  // Print all registered routes after server starts
  printRoutes(app);
});
