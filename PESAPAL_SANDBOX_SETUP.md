# Pesapal Sandbox Setup for Real M-Pesa Testing

## Get Sandbox Credentials

### 1. Register for Pesapal Developer Account
1. Visit: https://developer.pesapal.com/
2. Click "Sign Up" or "Register"
3. Fill in your details and verify your email

### 2. Create a Sandbox Application
1. Login to Pesapal Developer Portal
2. Go to "My Apps" or "Applications"
3. Click "Create New App"
4. Select "Sandbox" environment
5. Fill in app details:
   - App Name: TechMart
   - Description: E-commerce payment integration
   - Callback URL: `http://localhost:5173/payment/callback`

### 3. Get Your Credentials
After app creation, you'll get:
- **Consumer Key**: `qkio1BGGYAXe2TrRI9NUcNamL0EDMsOQ`
- **Consumer Secret**: `osGJ368RstLFKcRlmF0sXnboMttjGAWq`
- **Environment**: Sandbox

### 4. Test M-Pesa Numbers
Use these sandbox M-Pesa numbers for testing:
- **254708374149** (Most commonly used)
- **254708374150**
- **254708374151**

## Update Your Environment

### 1. Create/Update .env file:
```env
# Development Mode
VITE_NODE_ENV=development

# Pesapal Sandbox (REAL CREDENTIALS)
VITE_PESAPAL_SANDBOX_CONSUMER_KEY=qkio1BGGYAXe2TrRI9NUcNamL0EDMsOQ
VITE_PESAPAL_SANDBOX_CONSUMER_SECRET=osGJ368RstLFKcRlmF0sXnboMttjGAWq

# M-Pesa Receiver Number (Your test number)
VITE_MPESA_RECEIVER_NUMBER=254708374149

# App Configuration
VITE_APP_URL=http://localhost:5173
```

### 2. Deploy the Backend Proxy
```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project (replace with your project ref)
supabase link --project-ref your-project-ref

# Set environment variables
supabase secrets set PESAPAL_ENVIRONMENT=sandbox
supabase secrets set PESAPAL_SANDBOX_CONSUMER_KEY=qkio1BGGYAXe2TrRI9NUcNamL0EDMsOQ
supabase secrets set PESAPAL_SANDBOX_CONSUMER_SECRET=osGJ368RstLFKcRlmF0sXnboMttjGAWq

# Deploy the function
supabase functions deploy pesapal-proxy
```

## Test Real M-Pesa Integration

### 1. Switch to Production Mode
Update your `src/lib/pesapal.ts` to use production mode for testing:

```typescript
// Temporarily force production mode for testing
const isDevelopment = false; // Change this to false
```

### 2. Test the Flow
1. Start your development server: `npm run dev`
2. Go to checkout page
3. Select M-Pesa payment
4. Enter phone number: `254708374149`
5. Click "Pay with M-Pesa"
6. **You should receive a real M-Pesa prompt on your phone**
7. Enter PIN: `1234` (sandbox PIN)
8. Complete the transaction

## Expected Behavior

### ✅ Real M-Pesa Prompt
- You'll receive an actual M-Pesa prompt on your phone
- The prompt will show the exact amount from your order
- You can enter the sandbox PIN: `1234`

### ✅ Transaction Processing
- Payment will be processed through Pesapal sandbox
- You'll be redirected to callback page
- Order status will be updated to "paid"

### ✅ Sandbox Environment
- No real money is deducted
- Transactions are simulated but use real M-Pesa infrastructure
- You can test multiple scenarios safely

## Troubleshooting

### If No M-Pesa Prompt:
1. Check your credentials are correct
2. Verify the phone number format (254708374149)
3. Check Supabase function logs
4. Ensure backend proxy is deployed

### If Authentication Fails:
1. Verify consumer key/secret
2. Check environment variables in Supabase
3. Ensure function is deployed correctly

### If Payment Fails:
1. Use the correct sandbox PIN: `1234`
2. Check Pesapal sandbox dashboard
3. Verify callback URL is accessible

## Next Steps

Once real M-Pesa prompts are working:
1. Test with different amounts
2. Test error scenarios
3. Switch back to development mode for regular testing
4. Prepare for production deployment

## Important Notes

- **Sandbox Environment**: No real money is involved
- **Test Numbers**: Use only the provided sandbox numbers
- **PIN**: Always use `1234` for sandbox transactions
- **Limitations**: Sandbox has rate limits and may have delays 