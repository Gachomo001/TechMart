import express from 'express';
import { cardRouter } from './routes/card.js';
import { mpesaRouter } from './routes/mpesa.js';
import { locationsRouter } from './routes/locations.js';

const app = express();

// Simple middleware to log requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Mount routers one by one with error handling
console.log('Mounting locations router...');
try {
  app.use('/api/locations', locationsRouter);
  console.log('✅ Locations router mounted');
} catch (error) {
  console.error('❌ Failed to mount locations router:', error);
}

console.log('\nMounting MPESA router...');
try {
  app.use('/api/payment/mpesa', mpesaRouter);
  console.log('✅ MPESA router mounted');
} catch (error) {
  console.error('❌ Failed to mount MPESA router:', error);
}

console.log('\nMounting Card router...');
try {
  app.use('/api/payment/card', cardRouter);
  console.log('✅ Card router mounted');
} catch (error) {
  console.error('❌ Failed to mount Card router:', error);
}

// Basic health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n✅ Server running on port ${PORT}`);
  console.log('Try accessing: http://localhost:3000/health');
});
