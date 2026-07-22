const appSettings = {
  // Environment: 'development' | 'production'
  environment: 'development',
  
  // API Configuration
  api: {
    baseUrl: 'https://adminapi.classpedia.ai/api',
    baseUrlLocal: 'https://localhost:7043/api',
    chatbotUrl: 'https://chatbot.thetechmenders.com/api',
    timeout: 30000,
    retryAttempts: 3,
  },
  
  // Authentication
  auth: {
    tokenKey: 'auth_token',
    userKey: 'auth_user',
    tokenExpiry: 86400000, // 24 hours in ms
  },
  
  // Feature Flags
  features: {
    useMockData: true,
    enableAnalytics: false,
  },
  
  // Pagination
  pagination: {
    defaultPageSize: 100,
  },
  
  // App Info
  app: {
    name: 'ClassPedia',
    version: '1.1.1',
  }
};

// Helper to check environment
export const isDevelopment = () => appSettings.environment === 'development';
export const isProduction = () => appSettings.environment === 'production';

export default appSettings;
