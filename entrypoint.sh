#!/bin/sh

# Runtime environment variable injection for OpenShift
echo "🔧 Injecting runtime environment variables..."

# Create environment configuration file
cat > /usr/share/nginx/html/env-config.js << EOF
window.ENV_CONFIG = {
  VITE_CHEFS_BASE_URL: "${VITE_CHEFS_BASE_URL}",
  VITE_CHEFS_BASE_PATH: "${VITE_CHEFS_BASE_PATH}",
  VITE_API_FORM_ID: "${VITE_API_FORM_ID}",
  VITE_API_FORM_VERSION_ID: "${VITE_API_FORM_VERSION_ID}",
  VITE_API_KEY: "${VITE_API_KEY}"
};
EOF

echo "✅ Environment variables injected successfully"
echo "🚀 Starting nginx..."

# Start nginx
exec nginx -g "daemon off;"
