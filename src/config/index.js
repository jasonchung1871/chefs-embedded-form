// Environment configuration with runtime support
const getRuntimeEnv = (key, fallback) => {
  // First try runtime environment (from window.ENV_CONFIG)
  if (typeof window !== 'undefined' && window.ENV_CONFIG) {
    return window.ENV_CONFIG[key] || fallback;
  }
  // Fallback to Vite environment variables
  return import.meta.env[key] || fallback;
};

export const config = {
  // API Configuration - supports both build-time and runtime env vars
  apiUrl: getRuntimeEnv('VITE_CHEFS_BASE_URL', '') + getRuntimeEnv('VITE_CHEFS_BASE_PATH', '') || 'https://submit.digital.gov.bc.ca/app/api/v1',
  formId: getRuntimeEnv('VITE_API_FORM_ID', ''),
  formVersionId: getRuntimeEnv('VITE_API_FORM_VERSION_ID', ''),
  apiKey: getRuntimeEnv('VITE_API_KEY', ''),
  
  // Show configuration status (can be controlled independently)
  showConfigStatus: import.meta.env.VITE_SHOW_CONFIG !== 'false', // Default to true unless explicitly disabled
  
  // Debug mode  
  debugMode: import.meta.env.MODE === 'development',
  
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
