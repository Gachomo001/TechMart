import express from 'express';
import { mpesaRouter } from './routes/mpesa.js';

const app = express();
const port = 3002;

// Basic middleware
app.use(express.json());

// Simple test route
app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Test route works' });
});

// Mount MPESA router at the root
app.use(mpesaRouter);

// Simple route to test MPESA router
app.get('/mpesa-test', (req, res) => {
  res.json({ success: true, message: 'MPESA test route works' });
});

// Start the server
app.listen(port, () => {
  console.log(`\n✅ Test server running on port ${port}`);
  console.log('Try these endpoints:');
  console.log('- http://localhost:3002/test');
  console.log('- http://localhost:3002/mpesa-test');
  console.log('\nMPESA routes should be available at:');
  console.log('- GET  /test');
  console.log('- POST /');
  console.log('- GET  /status/:id');
  console.log('- POST /webhook');
  console.log('- GET  /status/:invoiceId');
});
