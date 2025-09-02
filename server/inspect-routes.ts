import { Router } from 'express';
import { mpesaRouter } from './routes/mpesa.js';
import { cardRouter } from './routes/card.js';
import locationsRouter from './routes/locations.js';

const printRoutes = (router: Router, prefix: string) => {
  if (router.stack) {
    router.stack.forEach((layer: any) => {
      if (layer.route) {
        const path = layer.route.path;
        const methods = Object.keys(layer.route.methods).join(', ').toUpperCase();
        console.log(`- ${methods} ${prefix}${path}`);
      } else if (layer.name === 'router') { // Handle nested routers
        printRoutes(layer.handle, prefix + layer.regexp.source.replace('^', '').replace('\\/?$', ''));
      }
    });
  }
};

console.log('--- Mpesa Routes ---');
printRoutes(mpesaRouter, '/api/mpesa');

console.log('\n--- Card Routes ---');
printRoutes(cardRouter, '/api/card');

console.log('\n--- Locations Routes ---');
printRoutes(locationsRouter, '/api/locations');
