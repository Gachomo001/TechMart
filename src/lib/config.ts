// Environment Configuration
export const config = {
  // Pesapal Configuration
  pesapal: {
    // Sandbox (for testing)
    sandbox: {
      baseUrl: 'https://cybqa.pesapal.com',
      consumerKey: import.meta.env.VITE_PESAPAL_SANDBOX_CONSUMER_KEY || 'your_sandbox_consumer_key',
      consumerSecret: import.meta.env.VITE_PESAPAL_SANDBOX_CONSUMER_SECRET || 'your_sandbox_consumer_secret',
      businessShortCode: '174379',
      passkey: import.meta.env.VITE_PESAPAL_SANDBOX_PASSKEY || 'your_sandbox_passkey',
      partyC: import.meta.env.VITE_MPESA_RECEIVER_NUMBER || 'your_mpesa_number', // Your M-Pesa number to receive funds
    },
    // Production (for live)
    production: {
      baseUrl: 'https://www.pesapal.com',
      consumerKey: import.meta.env.VITE_PESAPAL_PRODUCTION_CONSUMER_KEY || 'your_production_consumer_key',
      consumerSecret: import.meta.env.VITE_PESAPAL_PRODUCTION_CONSUMER_SECRET || 'your_production_consumer_secret',
      businessShortCode: import.meta.env.VITE_PESAPAL_PRODUCTION_SHORTCODE || 'your_production_shortcode',
      passkey: import.meta.env.VITE_PESAPAL_PRODUCTION_PASSKEY || 'your_production_passkey',
      partyC: import.meta.env.VITE_MPESA_RECEIVER_NUMBER || 'your_mpesa_number', // Your M-Pesa number to receive funds
    }
  },
  
  // App Configuration
  app: {
    name: 'TechMart',
    url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    isProduction: import.meta.env.VITE_NODE_ENV === 'production'
  }
};

// Helper function to get current Pesapal config
export const getPesapalConfig = () => {
  return config.app.isProduction ? config.pesapal.production : config.pesapal.sandbox;
}; 