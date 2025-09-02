console.log('=== SERVER STARTING ===');
console.log('Current directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'development');

import express, { Request, Response, NextFunction, json } from 'express';
import { mpesaRouter } from './routes/mpesa.js';
import { cardRouter } from './routes/card.js';
import locationsRouter from './routes/locations.js';
import cors, { CorsOptions } from 'cors';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createRequire } from 'module';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
const PORT = process.env.VITE_SERVER_PORT || 3001;

// Trust proxy headers for rate limiting and security
// Configure trust proxy properly for ngrok and development
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // Trust first proxy in production
} else {
  // In development with ngrok, trust all proxies but log for debugging
  app.set('trust proxy', true);
  console.log('Development mode: trusting all proxies for ngrok compatibility');
}

// Verify required environment variables
const requiredEnvVars = ['VITE_INTASEND_PUBLISHABLE_KEY', 'VITE_INTASEND_SECRET_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Debug logging
console.log('Server starting...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Available environment variables:', {
  VITE_INTASEND_PUBLISHABLE_KEY: process.env.VITE_INTASEND_PUBLISHABLE_KEY ? '***SET***' : 'MISSING',
  VITE_INTASEND_SECRET_KEY: process.env.VITE_INTASEND_SECRET_KEY ? '***SET***' : 'MISSING',
  NODE_ENV: process.env.NODE_ENV || 'development'
});

// CORS Configuration
const isProduction = process.env.NODE_ENV === 'production';

// Define allowed origins based on environment
const allowedOrigins = isProduction
  ? [
      'https://your-production-domain.com',
      'https://www.your-production-domain.com'
    ]
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001'
    ];

// CORS options
const corsOptions: CorsOptions = {
  origin: isProduction 
    ? (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      }
    : true, // In development, allow all origins when using the Vite proxy
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Authorization', 'Set-Cookie'],
  maxAge: 86400,
  optionsSuccessStatus: 200
};

// Apply CORS with the above options
app.use(cors(corsOptions));

// Capture RAW body for IntaSend card webhook BEFORE any JSON parsers
// This ensures req.rawBody is available and exact for HMAC verification
app.use('/api/payment/card/webhook', express.raw({ type: '*/*' }), (req: any, _res, next) => {
  try {
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body.toString('utf8');
      // Also populate parsed body so downstream code can use req.body
      try { req.body = JSON.parse(req.rawBody); } catch { /* ignore parse errors; handler may use raw */ }
    }
  } catch { /* no-op */ }
  next();
});

// Body parser middleware
app.use(bodyParser.json());

// Cookie parser middleware for CSRF protection
app.use(cookieParser());

// Routes
console.log('Registering routes...');

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Test endpoint to verify environment variables and routes
app.get('/api/test', (req, res) => {
  res.json({
    status: 'success',
    message: 'Test endpoint is working',
    env: {
      nodeEnv: process.env.NODE_ENV || 'development',
      hasSupabaseUrl: !!(process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL),
      hasSupabaseKey: !!(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
      serverPort: process.env.VITE_SERVER_PORT || 3001
    },
    routes: [
      'GET    /api/test',
      'GET    /api/health',
      'GET    /api/locations/health',
      'GET    /api/locations?type=county|region',
      'POST   /api/payment/card',
      'POST   /api/mpesa/'
    ]
  });
});

// Add body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount payment routes with error handling
const mountRoutes = () => {
  try {
    // Log route registration
    console.log('Mounting routes...');
    
    // Mount MPESA routes
    console.log('Mounting MPESA routes at /api/payment/mpesa and /api/mpesa');
    app.use('/api/payment/mpesa', mpesaRouter);
    app.use('/api/mpesa', mpesaRouter);
    
    // Mount Card routes
    console.log('Mounting Card routes at /api/payment/card');
    const cardRouterPath = '/api/payment/card';
    app.use(cardRouterPath, cardRouter);
    
    // Mount locations route
    console.log('Mounting Locations routes at /api/locations');
    app.use('/api/locations', locationsRouter);
    
    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: 'Server is running',
        time: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        routes: [
          'GET    /api/health',
          'POST   /api/payment/mpesa',
          'POST   /api/payment/mpesa/webhook',
          'POST   /api/payment/card',
          'POST   /api/payment/card/webhook'
        ]
      });
    });
    
    console.log('\n=== Registered Routes ===');
    console.log('  GET    /api/health');
    console.log('  POST   /api/payment/mpesa');
    console.log('  POST   /api/payment/mpesa/webhook');
    console.log('  POST   /api/payment/card');
    console.log('  POST   /api/payment/card/webhook');
    console.log('==========================\n');
    
  } catch (error) {
    console.error('Error mounting routes:', error);
    process.exit(1);
  }
};

// Mount all routes
mountRoutes();

// Test card charge endpoint
app.post('/api/test/card/charge', json(), (req, res) => {
  console.log('Test charge endpoint hit');
  res.json({
    success: true,
    message: 'Test endpoint works!',
    data: {
      received: req.body,
      timestamp: new Date().toISOString()
    }
  });
});

// Log webhook URLs for easy reference
console.log('\n=== Webhook URLs ===');
console.log('MPESA Webhook URL:', process.env.VITE_MPESA_WEBHOOK_URL || 'Not set');
console.log('Card Webhook URL:', process.env.VITE_CARD_WEBHOOK_URL || 'Not set');
console.log('==================\n');

// Ensure webhook URLs are valid
const validateWebhookUrl = (url: string | undefined, name: string) => {
  if (!url) {
    console.warn(`⚠️  ${name} URL is not set`);
    return;
  }
  try {
    new URL(url);
  } catch (error) {
    console.error(`❌ Invalid ${name} URL:`, url);
    console.error('Please check your .env file and ensure all webhook URLs are valid');
  }
};

// Validate webhook URLs
validateWebhookUrl(process.env.VITE_MPESA_WEBHOOK_URL, 'MPESA Webhook');
validateWebhookUrl(process.env.VITE_CARD_WEBHOOK_URL, 'Card Webhook');

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log(`Public URL: ${process.env.VITE_WEBHOOK_BASE_URL}`);
});
