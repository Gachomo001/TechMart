# Production Setup Guide

## Overview

This guide will help you set up the Pesapal integration for production, including environment variables, backend proxy deployment, and production testing.

## Step 1: Environment Variables Setup

### Development Environment (.env)
```env
# Development Mode
VITE_NODE_ENV=development

# Pesapal Sandbox (for testing)
VITE_PESAPAL_SANDBOX_CONSUMER_KEY=your_sandbox_consumer_key
VITE_PESAPAL_SANDBOX_CONSUMER_SECRET=your_sandbox_consumer_secret
VITE_PESAPAL_SANDBOX_PASSKEY=your_sandbox_passkey

# M-Pesa Receiver Number
VITE_MPESA_RECEIVER_NUMBER=your_mpesa_number

# App Configuration
VITE_APP_URL=http://localhost:5173
```

### Production Environment (.env.production)
```env
# Production Mode
VITE_NODE_ENV=production

# Pesapal Production
VITE_PESAPAL_PRODUCTION_CONSUMER_KEY=your_production_consumer_key
VITE_PESAPAL_PRODUCTION_CONSUMER_SECRET=your_production_consumer_secret
VITE_PESAPAL_PRODUCTION_PASSKEY=your_production_passkey

# M-Pesa Receiver Number
VITE_MPESA_RECEIVER_NUMBER=your_mpesa_number

# App Configuration
VITE_APP_URL=https://yourdomain.com
```

## Step 2: Supabase Edge Function Setup

### Deploy the Edge Function

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

4. **Set environment variables for the function**:
   ```bash
   supabase secrets set PESAPAL_ENVIRONMENT=sandbox
   supabase secrets set PESAPAL_SANDBOX_CONSUMER_KEY=your_sandbox_consumer_key
   supabase secrets set PESAPAL_SANDBOX_CONSUMER_SECRET=your_sandbox_consumer_secret
   supabase secrets set PESAPAL_PRODUCTION_CONSUMER_KEY=your_production_consumer_key
   supabase secrets set PESAPAL_PRODUCTION_CONSUMER_SECRET=your_production_consumer_secret
   ```

5. **Deploy the function**:
   ```bash
   supabase functions deploy pesapal-proxy
   ```

### For Production Deployment:
```bash
supabase secrets set PESAPAL_ENVIRONMENT=production
supabase functions deploy pesapal-proxy
```

## Step 3: Update Configuration

### Update config.ts for Production
```typescript
// src/lib/config.ts
export const config = {
  pesapal: {
    sandbox: {
      baseUrl: 'https://cybqa.pesapal.com',
      consumerKey: import.meta.env.VITE_PESAPAL_SANDBOX_CONSUMER_KEY,
      consumerSecret: import.meta.env.VITE_PESAPAL_SANDBOX_CONSUMER_SECRET,
      passkey: import.meta.env.VITE_PESAPAL_SANDBOX_PASSKEY,
      partyC: import.meta.env.VITE_MPESA_RECEIVER_NUMBER,
    },
    production: {
      baseUrl: 'https://www.pesapal.com',
      consumerKey: import.meta.env.VITE_PESAPAL_PRODUCTION_CONSUMER_KEY,
      consumerSecret: import.meta.env.VITE_PESAPAL_PRODUCTION_CONSUMER_SECRET,
      passkey: import.meta.env.VITE_PESAPAL_PRODUCTION_PASSKEY,
      partyC: import.meta.env.VITE_MPESA_RECEIVER_NUMBER,
    }
  },
  app: {
    name: 'TechMart',
    url: import.meta.env.VITE_APP_URL,
    isProduction: import.meta.env.VITE_NODE_ENV === 'production'
  }
};
```

## Step 4: Production Testing

### Test the Backend Proxy

1. **Test Authentication**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/pesapal-proxy \
     -H "Content-Type: application/json" \
     -d '{"action":"auth","data":{}}'
   ```

2. **Test Payment Initiation**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/pesapal-proxy \
     -H "Content-Type: application/json" \
     -d '{
       "action":"payment",
       "data":{
         "token":"your_token",
         "paymentData":{
           "id":"TEST_ORDER_123",
           "currency":"KES",
           "amount":1000,
           "description":"Test payment"
         }
       }
     }'
   ```

### Test in Production Mode

1. **Set production environment**:
   ```bash
   export VITE_NODE_ENV=production
   ```

2. **Build for production**:
   ```bash
   npm run build
   ```

3. **Test the application**:
   - Visit your production URL
   - Go through checkout flow
   - Verify real API calls are made

## Step 5: Deployment Checklist

### Before Going Live:

- [ ] **Environment Variables Set**:
  - [ ] Production consumer key
  - [ ] Production consumer secret
  - [ ] Production passkey
  - [ ] M-Pesa receiver number
  - [ ] Production app URL

- [ ] **Backend Proxy Deployed**:
  - [ ] Supabase Edge Function deployed
  - [ ] Environment variables set in Supabase
  - [ ] Function accessible via HTTPS

- [ ] **Frontend Updated**:
  - [ ] Production build created
  - [ ] Environment variables loaded
  - [ ] Backend proxy URL configured

- [ ] **Testing Completed**:
  - [ ] Authentication works
  - [ ] Payment initiation works
  - [ ] Payment status checking works
  - [ ] Callback handling works

- [ ] **Security Verified**:
  - [ ] HTTPS enabled
  - [ ] Environment variables secured
  - [ ] API keys not exposed in client

## Step 6: Monitoring and Maintenance

### Set Up Monitoring

1. **Error Tracking**:
   - Monitor Supabase function logs
   - Set up error alerts
   - Track payment success/failure rates

2. **Performance Monitoring**:
   - Monitor API response times
   - Track payment processing times
   - Monitor callback success rates

### Regular Maintenance

1. **Token Management**:
   - Monitor token expiry
   - Implement token refresh logic
   - Handle authentication failures

2. **Payment Reconciliation**:
   - Verify payments in Pesapal dashboard
   - Cross-check with your database
   - Handle failed payments

## Troubleshooting

### Common Issues:

1. **CORS Errors in Production**:
   - Verify Supabase function is deployed
   - Check function URL is correct
   - Ensure CORS headers are set

2. **Authentication Failures**:
   - Verify credentials are correct
   - Check environment variables
   - Monitor function logs

3. **Payment Failures**:
   - Check Pesapal dashboard
   - Verify callback URLs
   - Monitor payment status

### Debug Commands:

```bash
# Check function status
supabase functions list

# View function logs
supabase functions logs pesapal-proxy

# Test function locally
supabase functions serve pesapal-proxy

# Update function
supabase functions deploy pesapal-proxy
```

## Security Best Practices

1. **Environment Variables**:
   - Never commit `.env` files
   - Use different credentials for dev/prod
   - Rotate credentials regularly

2. **API Security**:
   - Use HTTPS for all communications
   - Validate all input data
   - Implement rate limiting

3. **Data Protection**:
   - Don't store sensitive card data
   - Encrypt sensitive information
   - Follow PCI compliance guidelines

## Support Resources

- **Pesapal Documentation**: https://developer.pesapal.com
- **Supabase Documentation**: https://supabase.com/docs
- **Pesapal Support**: support@pesapal.com

This setup ensures a secure, scalable, and maintainable production environment for your Pesapal integration. 