# Pesapal CORS Issue Solution

## The Problem

You're encountering a CORS (Cross-Origin Resource Sharing) error because Pesapal's API doesn't allow direct browser requests. This is a security feature to prevent unauthorized access.

## Solutions

### Option 1: Development Mode (Current Implementation)

I've updated the code to work in development mode by:

1. **Simulating Authentication**: Returns mock tokens for development
2. **Simulating Payments**: Returns mock payment responses
3. **Simulating Status Checks**: Returns mock payment status

This allows you to test the complete payment flow without real API calls.

### Option 2: Backend Proxy (Recommended for Production)

For production, you need a backend server to handle Pesapal API calls. Here are your options:

#### A. Create a Simple Backend Server

Create a Node.js/Express server:

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

// Pesapal proxy endpoint
app.post('/api/pesapal/auth', async (req, res) => {
  try {
    const response = await axios.post('https://cybqa.pesapal.com/api/Auth/RequestToken', {
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pesapal/payment', async (req, res) => {
  // Handle payment initiation
});

app.get('/api/pesapal/status/:id', async (req, res) => {
  // Handle status checking
});

app.listen(3001, () => {
  console.log('Proxy server running on port 3001');
});
```

#### B. Use Supabase Edge Functions

Create a Supabase Edge Function:

```typescript
// supabase/functions/pesapal-auth/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { consumer_key, consumer_secret } = await req.json()
  
  const response = await fetch('https://cybqa.pesapal.com/api/Auth/RequestToken', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ consumer_key, consumer_secret })
  })
  
  const data = await response.json()
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

#### C. Use Vercel Serverless Functions

Create a Vercel API route:

```typescript
// api/pesapal-auth.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import axios from 'axios'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const response = await axios.post('https://cybqa.pesapal.com/api/Auth/RequestToken', {
      consumer_key: process.env.PESAPAL_CONSUMER_KEY,
      consumer_secret: process.env.PESAPAL_CONSUMER_SECRET
    })
    
    res.status(200).json(response.data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}
```

## Getting Your Passkey

### For Sandbox:
1. Log into your Pesapal sandbox account
2. Navigate to **API Integration** or **Developer Settings**
3. Look for **Passkey** or **API Passkey**
4. Copy the passkey value

### For Production:
1. Log into your Pesapal production account
2. Navigate to **API Integration** or **Developer Settings**
3. Look for **Passkey** or **API Passkey**
4. Copy the passkey value

## Environment Variables

Update your `.env` file:

```env
# Sandbox
VITE_PESAPAL_SANDBOX_CONSUMER_KEY=your_consumer_key
VITE_PESAPAL_SANDBOX_CONSUMER_SECRET=your_consumer_secret
VITE_PESAPAL_SANDBOX_PASSKEY=your_passkey

# Production
VITE_PESAPAL_PRODUCTION_CONSUMER_KEY=your_production_consumer_key
VITE_PESAPAL_PRODUCTION_CONSUMER_SECRET=your_production_consumer_secret
VITE_PESAPAL_PRODUCTION_PASSKEY=your_production_passkey

# M-Pesa Receiver
VITE_MPESA_RECEIVER_NUMBER=your_mpesa_number

# Backend API URL (if using proxy)
VITE_API_BASE_URL=http://localhost:3001/api
```

## Testing the Current Implementation

1. **Start your development server**: `npm run dev`
2. **Visit the test page**: `http://localhost:5173/payment/test`
3. **Test the connection**: Click "Test Connection" - it should work in development mode
4. **Test payment flow**: Go through checkout and test payments

## Production Deployment Steps

1. **Choose a backend solution** (Node.js, Supabase, Vercel, etc.)
2. **Update the Pesapal service** to use your backend API
3. **Deploy your backend**
4. **Update environment variables** for production
5. **Test with real credentials**

## Current Development Mode Features

- ✅ Simulated authentication
- ✅ Simulated payment initiation
- ✅ Simulated payment status checking
- ✅ Complete payment flow testing
- ✅ Order creation and management
- ✅ Payment callback handling

## Next Steps

1. **Test the current development mode** to ensure everything works
2. **Choose a backend solution** for production
3. **Implement the backend proxy**
4. **Update the frontend** to use the backend API
5. **Deploy to production**

The current implementation allows you to test the complete payment flow while you work on the backend integration for production. 