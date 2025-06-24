# Sandbox Testing Guide for Pesapal Integration

## Overview

This guide will help you test both M-Pesa and card payment methods in the sandbox environment. The current implementation uses development mode to simulate API responses, allowing you to test the complete payment flow without real API calls.

## Testing Interface

Visit: `http://localhost:5173/payment/test`

### Available Test Buttons:

1. **Show Configuration** - Displays current settings
2. **Test Connection** - Tests authentication (simulated)
3. **Test Payment Flow** - Basic payment flow test
4. **Test M-Pesa Payment** - Specific M-Pesa payment test
5. **Test Card Payment** - Specific card payment test
6. **Test Both Payment Methods** - Tests both methods simultaneously

## M-Pesa Testing

### Test Data Used:
- **Phone Number**: `254708374149` (Pesapal test number)
- **Amount**: KES 1,500
- **Customer**: John Doe
- **Email**: john@example.com

### Expected Results:
- ✅ Payment initiation successful
- ✅ Transaction ID generated
- ✅ Checkout URL provided
- ✅ Simulated M-Pesa prompt

### Console Messages:
```
Development mode: Simulating M-Pesa payment initiation
```

## Card Payment Testing

### Test Data Used:
- **Card Number**: `4111111111111111` (Visa test card)
- **Expiry**: 12/2025
- **CVV**: 123
- **Amount**: KES 2,500
- **Customer**: Jane Smith
- **Email**: jane@example.com

### Expected Results:
- ✅ Payment initiation successful
- ✅ Transaction ID generated
- ✅ Checkout URL provided
- ✅ Simulated card processing

### Console Messages:
```
Development mode: Simulating card payment initiation
```

## Complete Flow Testing

### Step 1: Test Individual Methods

1. **Test M-Pesa**:
   - Click "Test M-Pesa Payment"
   - Verify success message
   - Note the checkout URL

2. **Test Card**:
   - Click "Test Card Payment"
   - Verify success message
   - Note the checkout URL

### Step 2: Test Both Methods

1. **Click "Test Both Payment Methods"**
2. **Verify both succeed**
3. **Check transaction IDs are different**

### Step 3: Test Complete Checkout Flow

1. **Add items to cart** on main site
2. **Go to checkout** (`http://localhost:5173/checkout`)
3. **Fill shipping details**
4. **Choose payment method**:
   - **M-Pesa**: Enter test phone `254708374149`
   - **Card**: Enter test card details
5. **Submit payment**
6. **Verify redirect** to payment callback
7. **Check order status** in database

## Test Card Numbers

### Visa Cards:
- `4111111111111111` (Success)
- `4000000000000002` (Declined)

### Mastercard:
- `5555555555554444` (Success)
- `5105105105105100` (Declined)

### Test Phone Numbers:
- `254708374149` (Success)
- `254708374150` (Failed)
- `254708374151` (Pending)

## Expected Console Output

### M-Pesa Payment:
```
Development mode: Simulating M-Pesa payment initiation
{
  amount: 1500,
  phoneNumber: "254708374149",
  orderNumber: "MPESA_TEST_1234567890",
  customerName: "John Doe",
  customerEmail: "john@example.com",
  customerPhone: "254708374149",
  description: "M-Pesa test payment"
}
```

### Card Payment:
```
Development mode: Simulating card payment initiation
{
  amount: 2500,
  orderNumber: "CARD_TEST_1234567890",
  customerName: "Jane Smith",
  customerEmail: "jane@example.com",
  customerPhone: "254708374149",
  description: "Card test payment",
  cardNumber: "4111111111111111",
  expiryMonth: "12",
  expiryYear: "2025",
  cvv: "123",
  cardHolderName: "Jane Smith"
}
```

## Database Verification

### Check Orders Table:
```sql
SELECT * FROM orders 
WHERE payment_method IN ('mpesa', 'card') 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Order Items:
```sql
SELECT o.order_number, o.payment_method, o.payment_status, oi.*
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.payment_method IN ('mpesa', 'card')
ORDER BY o.created_at DESC;
```

## Troubleshooting

### If M-Pesa Test Fails:
1. Check console for error messages
2. Verify phone number format (254XXXXXXXXX)
3. Ensure amount is valid (positive number)

### If Card Test Fails:
1. Check console for error messages
2. Verify card number format (16 digits)
3. Ensure expiry date is future date
4. Check CVV format (3-4 digits)

### If Both Tests Fail:
1. Check if development server is running
2. Verify environment variables are loaded
3. Check browser console for errors
4. Restart development server if needed

## Success Indicators

### ✅ M-Pesa Working:
- Console shows "Simulating M-Pesa payment initiation"
- Test returns success response
- Transaction ID is generated
- Checkout URL is provided

### ✅ Card Payment Working:
- Console shows "Simulating card payment initiation"
- Test returns success response
- Transaction ID is generated
- Checkout URL is provided

### ✅ Both Working:
- Both individual tests pass
- "Test Both Payment Methods" succeeds
- Different transaction IDs for each method
- All console messages appear correctly

## Next Steps After Testing

1. **Verify all tests pass**
2. **Test complete checkout flow**
3. **Check database entries**
4. **Test payment callbacks**
5. **Plan production backend setup**

## Production Considerations

Remember that this is development mode with simulated responses. For production:

1. **Set up backend proxy** (Node.js, Supabase, Vercel)
2. **Use real Pesapal credentials**
3. **Handle real API responses**
4. **Implement proper error handling**
5. **Set up webhook/IPN handling**

The current setup allows you to test the complete user experience while you work on the backend integration for production. 