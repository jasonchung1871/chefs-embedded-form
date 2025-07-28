import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  // Extract base URL and path from environment
  const chefsBaseUrl = env.VITE_CHEFS_BASE_URL || 'http://localhost:5173';
  const chefsBasePath = env.VITE_CHEFS_BASE_PATH || '/app/api/v1';
  const chefsApiUrl = `${chefsBaseUrl}${chefsBasePath}`;
  
  console.log('🔧 VITE: Using CHEFS Base URL:', chefsBaseUrl);
  console.log('🔧 VITE: Using CHEFS Base Path:', chefsBasePath);
  console.log('🔧 VITE: Full CHEFS API URL:', chefsApiUrl);
  
  return {
    plugins: [
      vue(),
      vueDevTools(),
    ],
    optimizeDeps: {
      include: ['formiojs'] // Updated to match the 4.17.4 package name
    },
    define: {
      global: 'globalThis',
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      },
    },
    server: {
      port: parseInt(env.VITE_PORT) || 3000, // Use env variable or default to 3000
      proxy: {
        // Unified CHEFS API proxy - uses environment variables
        '/api': {
          target: chefsBaseUrl, // Base URL only
          changeOrigin: true,
          secure: env.VITE_CHEFS_API_SECURE, // Set to false for local development
          rewrite: (path) => {
            // Rewrite /api to the configured base path
            const newPath = path.replace('/api', chefsBasePath);
            console.log(`🔧 PROXY REWRITE: ${path} -> ${newPath}`);
            return newPath;
          },
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              console.log(`🔧 PROXY: ${req.method} ${req.url} -> ${proxyReq.path}`);
              
              // Forward authorization headers to CHEFS API
              if (req.headers.authorization) {
                proxyReq.setHeader('Authorization', req.headers.authorization);
                console.log(`🔧 PROXY: Forwarding Authorization header`);
              }
              
              // Forward API key header to CHEFS API
              if (req.headers['x-api-key']) {
                proxyReq.setHeader('X-API-KEY', req.headers['x-api-key']);
                console.log(`🔧 PROXY: Forwarding X-API-KEY header`);
              }
            });
            
            proxy.on('proxyRes', (proxyRes) => {
              // Add CORS headers to responses
              proxyRes.headers['Access-Control-Allow-Origin'] = '*';
              proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, PATCH, OPTIONS';
              proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
            });
          }
        }
      }
    },
    build: {
      // Generate source maps for easier debugging
      sourcemap: true,
      // Optimize bundle size
      rollupOptions: {
        output: {
          // Manual chunks for better caching
          manualChunks: {
            vendor: ['vue'],
          }
        }
      }
    }
  }
})