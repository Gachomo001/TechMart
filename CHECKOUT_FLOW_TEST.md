# Complete Checkout Flow Testing Guide

## Prerequisites
- Development server running (`npm run dev`)
- Both payment methods tested and working
- Database connection active

## Test Scenario 1: M-Pesa Checkout Flow

### Step 1: Add Items to Cart
1. Visit `http://localhost:5173/`
2. Browse products and add 2-3 items to cart
3. Verify items appear in cart sidebar

### Step 2: Proceed to Checkout
1. Click "Checkout" or go to `http://localhost:5173/checkout`
2. Verify cart items are displayed
3. Check totals are calculated correctly

### Step 3: Fill Shipping Information
1. **First Name**: John
2. **Last Name**: Doe
3. **Email**: john.doe@example.com
4. **Phone**: 254708374149 (test M-Pesa number)
5. **County**: Select any county
6. **Region**: Select any region
7. **Shipping Type**: Standard Delivery
8. Click "Continue to Payment"

### Step 4: M-Pesa Payment
1. Select **"M-Pesa"** payment method
2. Enter phone number: `254708374149`
3. Click **"Pay with M-Pesa"**
4. Verify console shows: `Development mode: Simulating M-Pesa payment initiation`
5. Should redirect to payment callback page
6. Verify success message appears
7. Check order is created in database

## Test Scenario 2: Card Checkout Flow

### Step 1-3: Same as M-Pesa (above)

### Step 4: Card Payment
1. Select **"Card"** payment method
2. Enter card details:
   - **Card Number**: `4111111111111111`
   - **Expiry Date**: `12/25`
   - **CVV**: `123`
   - **Name on Card**: John Doe
   - **Billing Address**: 123 Test Street
   - **City**: Nairobi
   - **State**: Nairobi
   - **ZIP Code**: 00100
3. Click **"Pay with Card"**
4. Verify console shows: `Development mode: Simulating card payment initiation`
5. Should redirect to payment callback page
6. Verify success message appears
7. Check order is created in database

## Database Verification

### Check Orders Table:
```sql
SELECT 
  order_number,
  payment_method,
  payment_status,
  total_amount,
  created_at
FROM orders 
WHERE payment_method IN ('mpesa', 'card') 
ORDER BY created_at DESC 
LIMIT 5;
```

### Check Order Items:
```sql
SELECT 
  o.order_number,
  o.payment_method,
  o.payment_status,
  oi.product_id,
  oi.quantity,
  oi.price_at_time
FROM orders o
JOIN order_items oi ON o.id = oi.order_id
WHERE o.payment_method IN ('mpesa', 'card')
ORDER BY o.created_at DESC;
```

## Expected Results

### ✅ Successful M-Pesa Flow:
- Order created with `payment_method: 'mpesa'`
- `payment_status: 'paid'` (after callback)
- Order items saved correctly
- Receipt generated
- Cart cleared after payment

### ✅ Successful Card Flow:
- Order created with `payment_method: 'card'`
- `payment_status: 'paid'` (after callback)
- Order items saved correctly
- Receipt generated
- Cart cleared after payment

### ✅ Payment Callback:
- Redirects to `/payment/callback`
- Shows success/failure message
- Updates order status in database
- Provides navigation options

## Troubleshooting

### If Checkout Fails:
1. Check browser console for errors
2. Verify database connection
3. Check if all required fields are filled
4. Ensure payment method is selected

### If Payment Redirect Fails:
1. Check payment callback route is working
2. Verify order creation in database
3. Check payment service responses

### If Order Not Created:
1. Check Supabase connection
2. Verify table permissions
3. Check for validation errors

## Success Checklist

- [ ] Items can be added to cart
- [ ] Checkout page loads correctly
- [ ] Shipping information saves
- [ ] M-Pesa payment initiates
- [ ] Card payment initiates
- [ ] Payment callback works
- [ ] Orders are created in database
- [ ] Order items are saved
- [ ] Cart is cleared after payment
- [ ] Success messages display correctly

## Next Steps After Testing

1. **Verify all flows work correctly**
2. **Check database entries are complete**
3. **Test error scenarios** (invalid data, network issues)
4. **Proceed to backend proxy setup**
5. **Update environment variables for production** 