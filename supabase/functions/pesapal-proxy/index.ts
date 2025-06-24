// @ts-ignore - Supabase Edge Function (Deno environment)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore - Supabase Edge Function (Deno environment)
import { corsHeaders } from "../_shared/cors.ts"

// Declare Deno global for TypeScript
declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

interface PesapalAuthRequest {
  consumer_key: string;
  consumer_secret: string;
}

interface PesapalPaymentRequest {
  id: string;
  currency: string;
  amount: number;
  description: string;
  callback_url: string;
  notification_id: string;
  billing_address: {
    email_address: string;
    phone_number: string;
    country_code: string;
    first_name: string;
    last_name: string;
    line_1: string;
    line_2: string;
    city: string;
    state: string;
    postal_code: string;
    zip_code: string;
  };
  card_details?: {
    card_number: string;
    expiry_month: string;
    expiry_year: string;
    cvv: string;
    card_holder_name: string;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, data } = await req.json()

    // Get environment variables
    const isProduction = Deno.env.get('PESAPAL_ENVIRONMENT') === 'production'
    const baseUrl = isProduction 
      ? 'https://www.pesapal.com' 
      : 'https://cybqa.pesapal.com'
    
    const consumerKey = isProduction
      ? Deno.env.get('PESAPAL_PRODUCTION_CONSUMER_KEY')
      : Deno.env.get('PESAPAL_SANDBOX_CONSUMER_KEY')
    
    const consumerSecret = isProduction
      ? Deno.env.get('PESAPAL_PRODUCTION_CONSUMER_SECRET')
      : Deno.env.get('PESAPAL_SANDBOX_CONSUMER_SECRET')

    if (!consumerKey || !consumerSecret) {
      throw new Error('Pesapal credentials not configured')
    }

    let response: Response

    switch (action) {
      case 'auth':
        // Get authentication token
        response = await fetch(`${baseUrl}/api/Auth/RequestToken`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            consumer_key: consumerKey,
            consumer_secret: consumerSecret
          })
        })
        break

      case 'payment':
        // Initiate payment
        const token = data.token
        if (!token) {
          throw new Error('Authentication token required')
        }

        response = await fetch(`${baseUrl}/api/Transactions/SubmitOrderRequest`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data.paymentData)
        })
        break

      case 'status':
        // Check payment status
        const statusToken = data.token
        const trackingId = data.trackingId
        if (!statusToken || !trackingId) {
          throw new Error('Token and tracking ID required')
        }

        response = await fetch(`${baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${statusToken}`,
          }
        })
        break

      default:
        throw new Error('Invalid action')
    }

    const result = await response.json()

    return new Response(
      JSON.stringify(result),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      { 
        status: 400,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json'
        } 
      }
    )
  }
}) 