// Environment configuration
export const config = {
  // API Configuration
  apiUrl: import.meta.env.VITE_CHEFS_API_URL || 'https://submit.digital.gov.bc.ca/app/api/v1',
  formId: import.meta.env.VITE_API_FORM_ID || '',
  formVersionId: import.meta.env.VITE_API_FORM_VERSION_ID || '',
  apiKey: import.meta.env.VITE_API_KEY || '',
  
  // Debug mode
  debugMode: import.meta.env.VITE_DEBUG_MODE === 'true' || import.meta.env.MODE === 'development',
  
  // Build mode check
  isProduction: import.meta.env.MODE === 'production',
  isDevelopment: import.meta.env.MODE === 'development',
};

// Log configuration in development mode
if (config.debugMode) {
  console.log('CHEFS Embedded Form Configuration:', {
    ...config,
    apiKey: config.apiKey ? '***REDACTED***' : 'NOT_SET'
  });
}

export default config;
