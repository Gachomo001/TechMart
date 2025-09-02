// Environment Configuration
export const config = {
  // App Configuration
  app: {
    name: 'TechMart',
    url: import.meta.env.VITE_APP_URL || 'http://localhost:5173',
    isProduction: import.meta.env.VITE_NODE_ENV === 'production'
  }
};