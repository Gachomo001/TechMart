#!/bin/bash

echo "🔧 Setting up Real M-Pesa Testing with Pesapal Sandbox"
echo "======================================================"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Step 1: Get Pesapal Sandbox Credentials${NC}"
echo "1. Visit: https://developer.pesapal.com/"
echo "2. Register/Login to get sandbox credentials"
echo "3. Create a sandbox application"
echo "4. Get your Consumer Key and Consumer Secret"
echo ""

echo -e "${BLUE}Step 2: Update Environment Variables${NC}"
echo "Create/update your .env file with:"
echo ""
echo "VITE_PESAPAL_SANDBOX_CONSUMER_KEY=your_actual_consumer_key"
echo "VITE_PESAPAL_SANDBOX_CONSUMER_SECRET=your_actual_consumer_secret"
echo "VITE_MPESA_RECEIVER_NUMBER=254708374149"
echo ""

echo -e "${BLUE}Step 3: Deploy Backend Proxy${NC}"
echo "Run these commands:"
echo ""
echo "npm install -g supabase"
echo "supabase login"
echo "supabase link --project-ref YOUR_PROJECT_REF"
echo "supabase secrets set PESAPAL_ENVIRONMENT=sandbox"
echo "supabase secrets set PESAPAL_SANDBOX_CONSUMER_KEY=your_key"
echo "supabase secrets set PESAPAL_SANDBOX_CONSUMER_SECRET=your_secret"
echo "supabase functions deploy pesapal-proxy"
echo ""

echo -e "${BLUE}Step 4: Enable Real M-Pesa Testing${NC}"
echo "Temporarily modify src/lib/pesapal.ts:"
echo "Change: const isDevelopment = import.meta.env.DEV;"
echo "To: const isDevelopment = false;"
echo ""

echo -e "${BLUE}Step 5: Test Real M-Pesa${NC}"
echo "1. Start server: npm run dev"
echo "2. Go to checkout"
echo "3. Select M-Pesa payment"
echo "4. Enter phone: 254708374149"
echo "5. Click 'Pay with M-Pesa'"
echo "6. Check your phone for M-Pesa prompt"
echo "7. Enter PIN: 1234"
echo ""

echo -e "${YELLOW}Important Notes:${NC}"
echo "- Use sandbox M-Pesa numbers: 254708374149, 254708374150, 254708374151"
echo "- Sandbox PIN is always: 1234"
echo "- No real money is deducted in sandbox"
echo "- Remember to switch back to development mode after testing"
echo ""

echo -e "${GREEN}Ready to test real M-Pesa integration!${NC}" 