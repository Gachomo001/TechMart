const axios = require('axios');

// Pesapal Sandbox Configuration
const PESAPAL_SANDBOX_CONFIG = {
  baseUrl: 'https://cybqa.pesapal.com',
  consumerKey: 'qkio1BGGYAXe2TrRI9NUcNamL0EDMsOQ',
  consumerSecret: 'osGJ368RstLFKcRlmF0sXnboMttjGAWq'
};

async function testMpesaIntegration() {
  try {
    console.log('🔧 Testing M-Pesa Integration with Pesapal Sandbox');
    console.log('================================================');

    // Step 1: Get Authentication Token
    console.log('\n1. Getting authentication token...');
    const authResponse = await axios.post(`${PESAPAL_SANDBOX_CONFIG.baseUrl}/api/Auth/RequestToken`, {
      consumer_key: PESAPAL_SANDBOX_CONFIG.consumerKey,
      consumer_secret: PESAPAL_SANDBOX_CONFIG.consumerSecret
    });

    const token = authResponse.data.token;
    console.log('✅ Authentication successful!');
    console.log('Token:', token.substring(0, 20) + '...');

    // Step 2: Initiate M-Pesa Payment
    console.log('\n2. Initiating M-Pesa payment...');
    const paymentData = {
      id: `TEST_ORDER_${Date.now()}`,
      currency: 'KES',
      amount: 100,
      description: 'Test payment for TechMart',
      callback_url: 'http://localhost:5173/payment/callback',
      notification_id: 'test_notification',
      billing_address: {
        email_address: 'test@example.com',
        phone_number: '254708374149', // Sandbox test number
        country_code: 'KE',
        first_name: 'Test',
        last_name: 'User',
        line_1: 'N/A',
        line_2: 'N/A',
        city: 'N/A',
        state: 'N/A',
        postal_code: 'N/A',
        zip_code: 'N/A'
      }
    };

    const paymentResponse = await axios.post(`${PESAPAL_SANDBOX_CONFIG.baseUrl}/api/Transactions/SubmitOrderRequest`, paymentData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Payment initiated successfully!');
    console.log('Order Tracking ID:', paymentResponse.data.order_tracking_id);
    console.log('Redirect URL:', paymentResponse.data.redirect_url);

    // Step 3: Instructions for M-Pesa Prompt
    console.log('\n📱 M-PESA PROMPT INSTRUCTIONS:');
    console.log('================================');
    console.log('1. You should receive an M-Pesa prompt on your phone');
    console.log('2. Phone number: 254708374149 (sandbox test number)');
    console.log('3. Amount: KES 100');
    console.log('4. Enter PIN: 1234 (sandbox PIN)');
    console.log('5. Complete the transaction');
    console.log('6. Check the redirect URL for status updates');

    // Step 4: Check Payment Status (after a delay)
    console.log('\n3. Checking payment status in 10 seconds...');
    setTimeout(async () => {
      try {
        const statusResponse = await axios.get(
          `${PESAPAL_SANDBOX_CONFIG.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${paymentResponse.data.order_tracking_id}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        console.log('✅ Payment status checked!');
        console.log('Status:', statusResponse.data.payment_status_description);
        console.log('Amount:', statusResponse.data.amount);
        console.log('Payment Method:', statusResponse.data.payment_method);
      } catch (error) {
        console.log('❌ Error checking status:', error.response?.data || error.message);
      }
    }, 10000);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your internet connection');
    console.log('2. Verify the credentials are correct');
    console.log('3. Ensure you\'re using the sandbox environment');
    console.log('4. Check if Pesapal sandbox is accessible');
  }
}

// Run the test
testMpesaIntegration(); 