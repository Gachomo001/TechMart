# Production Setup Guide

## Overview

This guide will help you set up the M-Pesa integration for production, including environment variables and production testing.

## Step 1: Environment Variables Setup

### Development Environment (.env)
```env
# Development Mode
VITE_NODE_ENV=development

# M-Pesa Configuration
VITE_MPESA_RECEIVER_NUMBER=your_mpesa_number

# App Configuration
VITE_APP_URL=http://localhost:5173
```

### Production Environment (.env.production)
```env
# Production Mode
VITE_NODE_ENV=production

# M-Pesa Configuration
VITE_MPESA_RECEIVER_NUMBER=your_mpesa_number

# App Configuration
VITE_APP_URL=https://yourdomain.com
```

## Step 2: M-Pesa Integration

### Configuration

1. **Update config.ts**:
   ```typescript
   // src/lib/config.ts
   export const config = {
     mpesa: {
       receiverNumber: import.meta.env.VITE_MPESA_RECEIVER_NUMBER,
     },
     app: {
       name: 'TechMart',
       url: import.meta.env.VITE_APP_URL,
       isProduction: import.meta.env.VITE_NODE_ENV === 'production'
     }
   };
   ```

## Step 3: Production Testing

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
   - Verify M-Pesa payment flow works

## Step 4: Deployment Checklist

### Before Going Live:

- [ ] **Environment Variables Set**:
  - [ ] M-Pesa receiver number
  - [ ] Production app URL

- [ ] **Frontend Updated**:
  - [ ] Production build created
  - [ ] Environment variables loaded

- [ ] **Testing Completed**:
  - [ ] Payment initiation works
  - [ ] Payment status checking works
  - [ ] Callback handling works

- [ ] **Security Verified**:
  - [ ] HTTPS enabled
  - [ ] Environment variables secured

## Step 5: Monitoring and Maintenance

### Set Up Monitoring

1. **Error Tracking**:
   - Monitor application logs
   - Set up error alerts
   - Track payment success/failure rates

2. **Performance Monitoring**:
   - Monitor API response times
   - Track payment processing times

### Regular Maintenance

1. **Payment Reconciliation**:
   - Verify payments in your database
   - Handle failed payments
   - Monitor for any payment issues

## Troubleshooting

### Common Issues:

1. **Payment Failures**:
   - Verify M-Pesa credentials
   - Check network connectivity
   - Monitor payment status

2. **Callback Issues**:
   - Verify callback URLs
   - Check server logs for errors

3. **Mobile Money Number Issues**:
   - Ensure correct phone number format
   - Verify number is registered for M-Pesa

## Security Best Practices

1. **Data Protection**:
   - Encrypt sensitive information
   - Follow payment security best practices
   - Regularly audit your payment processing

## Support Resources

- **M-Pesa Documentation**: https://developer.safaricom.co.ke/
- **Supabase Documentation**: https://supabase.com/docs

This setup ensures a secure, scalable, and maintainable production environment for your M-Pesa integration.