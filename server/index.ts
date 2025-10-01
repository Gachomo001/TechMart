// Load environment variables FIRST, before any other imports
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from root .env file
dotenv.config({ path: join(__dirname, '../.env') });

// Debug: Log if env vars are loaded
console.log('Environment variables loaded:');
console.log('VITE_SUPABASE_URL:', !!process.env.VITE_SUPABASE_URL);
console.log('VITE_SUPABASE_ANON_KEY:', !!process.env.VITE_SUPABASE_ANON_KEY);
console.log('SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('=== SERVER STARTING ===');
console.log('Current directory:', process.cwd());
console.log('Environment:', process.env.NODE_ENV || 'development');

// Now import modules that depend on environment variables
import express, { Request, Response, NextFunction, json } from 'express';
// import { mpesaRouter } from './routes/mpesa.js';
// import { cardRouter } from './routes/card.js';
import cors, { CorsOptions } from 'cors';
import { createRequire } from 'module';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

const requiredEnvVars = ['PAYSTACK_SECRET_KEY'];
const require = createRequire(import.meta.url);

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
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// After environment verification
const { paystackRouter } = await import('./routes/paystack.js');
const { default: locationsRouter } = await import('./routes/locations.js');
const { default: footerLinksRouter } = await import('./routes/footer-links.js');

console.log('Available environment variables:', {
  PAYSTACK_PUBLIC_KEY: process.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.PAYSTACK_PUBLIC_KEY ? '***SET***' : 'MISSING',
  PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY ? '***SET***' : 'MISSING',
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
      'http://127.0.0.1:3001',
      'http://localhost:5173',
      'http://127.0.0.1:5173'
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

// Capture RAW body for PayStack webhook BEFORE any JSON parsers
app.use('/api/payment/paystack/webhook', express.raw({ type: '*/*' }), (req: any, _res, next) => {
  try {
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body.toString('utf8');
      try { req.body = JSON.parse(req.rawBody); } catch { /* ignore parse errors */ }
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
      hasSupabaseUrl: !!(process.env.VITE_SUPABASE_URL),
      hasSupabaseKey: !!(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
      serverPort: process.env.VITE_SERVER_PORT || 3001
    },
    routes: [
      'GET    /api/test',
      'GET    /api/health',
      'GET    /api/locations',
      'POST   /api/payment/paystack',
      'POST   /api/payment/paystack/webhook'
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

    app.use('/api/payment/paystack', paystackRouter);
    
    // Mount locations route
    console.log('Mounting Locations routes at /api/locations');
    app.use('/api/locations', locationsRouter);
    
    // Mount footer links route
    console.log('Mounting Footer Links routes at /api/footer-links');
    app.use('/api/footer-links', footerLinksRouter);
    
    // Health check endpoint
    app.get('/api/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        message: 'Server is running',
        time: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        routes: [
          'GET    /api/health',
          'POST   /api/payment/paystack',
          'POST   /api/payment/paystack/webhook',
          'GET    /api/payment/paystack/verify/:reference'
        ]
      });
    });
    
    console.log('\n=== Registered Routes ===');
    console.log('  GET    /api/health');
    console.log('  GET    /api/test');
    console.log('  POST   /api/payment/paystack');
    console.log('  POST   /api/payment/paystack/webhook');
    console.log('  GET    /api/payment/paystack/verify/:reference');
    console.log('  GET    /api/locations');
    console.log('  GET    /api/footer-links');
    console.log('==========================\n');
    
  } catch (error) {
    console.error('Error mounting routes:', error);
    process.exit(1);
  }
};

// Mount all routes
mountRoutes();

// Test PayStack endpoint
app.post('/api/test/paystack/charge', json(), (req, res) => {
  console.log('Test PayStack endpoint hit');
  res.json({
    success: true,
    message: 'Test PayStack endpoint works!',
    data: {
      received: req.body,
      timestamp: new Date().toISOString()
    }
  });
});

// Log webhook URLs for easy reference
console.log('\n=== Webhook URLs ===');
console.log('PayStack Webhook URL: [Your ngrok URL]/api/payment/paystack/webhook');
console.log('==================\n');

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local URL: http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Test endpoint: http://localhost:${PORT}/api/test`);
  console.log('\n🚀 PayStack payment server is ready!');
  console.log('💡 Start ngrok with: ngrok http 3001');
});