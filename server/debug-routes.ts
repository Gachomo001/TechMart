import { locationsRouter } from './routes/locations.js';
import { mpesaRouter } from './routes/mpesa.js';
import { cardRouter } from './routes/card.js';

function debugRouter(router: any, prefix = '') {
  router.stack.forEach((layer: any) => {
    if (layer.route) {
      // Handle regular routes
      const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
      console.log(`${methods.padEnd(7)} ${prefix}${layer.route.path}`);
    } else if (layer.name === 'router' || layer.name === 'bound dispatch') {
      // Handle router middleware
      const newPrefix = prefix + (layer.regexp.toString() !== '/^\\/?(?=\\/|$)/i' ? 
        layer.regexp.toString().replace(/\^|\$|\/|\\/g, '') + '/' : '');
      debugRouter(layer.handle, newPrefix);
    }
  });
}

console.log('=== DEBUGGING ROUTES ===');
console.log('\nLocations Router:');
debugRouter(locationsRouter, '/api/locations');
console.log('\nMPESA Router:');
debugRouter(mpesaRouter, '/api/payment/mpesa');
console.log('\nCard Router:');
debugRouter(cardRouter, '/api/payment/card');
console.log('\n=== ROUTE DEBUGGING COMPLETE ===');
