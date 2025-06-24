# Pesapal Payment Gateway Integration Guide

This guide will help you integrate Pesapal payment gateway with both M-Pesa and card payment options in your TechMart checkout page.

## Prerequisites

1. **Pesapal Account**: Sign up for a Pesapal merchant account at [https://www.pesapal.com](https://www.pesapal.com)
2. **M-Pesa Business Account**: You need an M-Pesa business account to receive payments
3. **Personal M-Pesa Number**: The phone number where you want to receive the funds

## Step 1: Environment Configuration

Create a `.env` file in your project root with the following variables:

```env
# Pesapal Configuration
# Sandbox (for testing)
VITE_PESAPAL_SANDBOX_CONSUMER_KEY=your_sandbox_consumer_key
VITE_PESAPAL_SANDBOX_CONSUMER_SECRET=your_sandbox_consumer_secret
VITE_PESAPAL_SANDBOX_PASSKEY=your_sandbox_passkey

# Production (for live)
VITE_PESAPAL_PRODUCTION_CONSUMER_KEY=your_production_consumer_key
VITE_PESAPAL_PRODUCTION_CONSUMER_SECRET=your_production_consumer_secret
VITE_PESAPAL_PRODUCTION_SHORTCODE=your_production_shortcode
VITE_PESAPAL_PRODUCTION_PASSKEY=your_production_passkey

# M-Pesa Receiver Number (where funds will be received)
VITE_MPESA_RECEIVER_NUMBER=your_mpesa_number

# App Configuration
VITE_APP_URL=http://localhost:5173
VITE_NODE_ENV=development
```

## Step 2: Get Pesapal Credentials

### For Sandbox (Testing):

1. Log into your Pesapal sandbox account
2. Navigate to API Integration section
3. Copy your Consumer Key and Consumer Secret
4. Note your Notification ID (you'll need this for IPN)

### For Production (Live):

1. Log into your Pesapal production account
2. Navigate to API Integration section
3. Copy your Consumer Key and Consumer Secret
4. Note your Business Shortcode and Passkey
5. Set up your Notification ID for IPN

## Step 3: M-Pesa Configuration

### Business Account Setup:

1. Register for M-Pesa Business Account
2. Get your Business Shortcode
3. Set up your Paybill number
4. Configure your Passkey

### Personal Number Setup:

1. Use your personal M-Pesa number as the receiver
2. This number will receive all payments from both M-Pesa and card transactions
3. Update the `VITE_MPESA_RECEIVER_NUMBER` in your `.env` file

## Step 4: Testing with Sandbox

### M-Pesa Testing:

1. Use test phone numbers provided by Pesapal
2. Common test numbers:
   - `254708374149` (Success)
   - `254708374150` (Failed)
   - `254708374151` (Pending)

### Card Testing:

1. Use test card numbers provided by Pesapal
2. Common test cards:
   - Visa: `4111111111111111`
   - Mastercard: `5555555555554444`
   - Any future expiry date
   - Any 3-digit CVV

## Step 5: Payment Flow

### M-Pesa Payment Flow:

1. Customer selects M-Pesa payment method
2. Enters their M-Pesa phone number
3. Clicks "Pay with M-Pesa"
4. System creates order in database (status: pending)
5. Redirects to Pesapal checkout page
6. Customer receives M-Pesa prompt
7. Customer enters M-Pesa PIN
8. Payment is processed
9. Customer is redirected back to your site
10. Payment status is updated in database

### Card Payment Flow:

1. Customer selects card payment method
2. Enters card details (number, expiry, CVV, name)
3. Clicks "Pay with Card"
4. System creates order in database (status: pending)
5. Redirects to Pesapal checkout page
6. Customer completes card payment
7. Payment is processed
8. Customer is redirected back to your site
9. Payment status is updated in database

## Step 6: Production Deployment

### Before Going Live:

1. **Update Environment Variables**:
   - Set `VITE_NODE_ENV=production`
   - Use production Pesapal credentials
   - Update `VITE_APP_URL` to your production domain

2. **Configure Callback URLs**:
   - Update callback URL in Pesapal dashboard
   - Set to: `https://yourdomain.com/payment/callback`

3. **Set up IPN (Instant Payment Notification)**:
   - Configure IPN URL in Pesapal dashboard
   - Set to: `https://yourdomain.com/api/payment/ipn`

4. **SSL Certificate**:
   - Ensure your domain has valid SSL certificate
   - Required for secure payment processing

## Step 7: Monitoring and Troubleshooting

### Payment Status Tracking:

- **PENDING**: Payment initiated but not completed
- **COMPLETED**: Payment successful
- **FAILED**: Payment failed
- **CANCELLED**: Payment cancelled by user

### Common Issues:

1. **Authentication Failed**:
   - Check Consumer Key and Secret
   - Verify API endpoint URLs

2. **Payment Not Received**:
   - Check M-Pesa receiver number
   - Verify business account status
   - Check transaction logs

3. **Callback Not Working**:
   - Verify callback URL configuration
   - Check server logs for errors
   - Ensure proper SSL setup

## Step 8: Security Best Practices

1. **Environment Variables**:
   - Never commit `.env` files to version control
   - Use different credentials for sandbox and production
   - Rotate credentials regularly

2. **Payment Validation**:
   - Always verify payment status with Pesapal API
   - Don't rely solely on callback data
   - Implement proper error handling

3. **Data Protection**:
   - Don't store sensitive card data
   - Use HTTPS for all payment communications
   - Implement proper session management

## Step 9: Testing Checklist

### Sandbox Testing:

- [ ] M-Pesa payment with success scenario
- [ ] M-Pesa payment with failure scenario
- [ ] Card payment with success scenario
- [ ] Card payment with failure scenario
- [ ] Payment callback handling
- [ ] Order status updates
- [ ] Error handling and user feedback

### Production Testing:

- [ ] All sandbox tests with real credentials
- [ ] SSL certificate validation
- [ ] Callback URL accessibility
- [ ] IPN configuration
- [ ] Payment reconciliation
- [ ] Customer support procedures

## Support and Resources

- **Pesapal Documentation**: [https://developer.pesapal.com](https://developer.pesapal.com)
- **M-Pesa Business**: [https://www.safaricom.co.ke/business/m-pesa-business](https://www.safaricom.co.ke/business/m-pesa-business)
- **Pesapal Support**: support@pesapal.com

## Important Notes

1. **Funds Flow**: All payments (both M-Pesa and card) will be received in the M-Pesa number specified in `VITE_MPESA_RECEIVER_NUMBER`

2. **Transaction Fees**: Pesapal charges transaction fees. Check their pricing for current rates.

3. **Settlement Time**: M-Pesa payments are usually instant, while card payments may take 1-3 business days.

4. **Compliance**: Ensure your business complies with local payment regulations and data protection laws.

5. **Backup**: Always have a backup payment method in case of service disruptions.

## Troubleshooting Commands

```bash
# Check if environment variables are loaded
npm run dev

# Test Pesapal connection
curl -X POST https://cybqa.pesapal.com/api/Auth/RequestToken \
  -H "Content-Type: application/json" \
  -d '{"consumer_key":"your_key","consumer_secret":"your_secret"}'

# Check payment status
curl -X GET "https://cybqa.pesapal.com/api/Transactions/GetTransactionStatus?orderTrackingId=your_tracking_id" \
  -H "Authorization: Bearer your_token"
```

This integration ensures that all payments from both M-Pesa and card transactions are received in your specified M-Pesa number, providing a unified payment experience for your customers. 