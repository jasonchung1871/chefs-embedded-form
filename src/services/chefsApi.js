import axios from 'axios';

/**
 * Unified CHEFS API Service
 * Combines form schema/module operations and file operations into one service
 * Handles route-based authentication (some routes require auth, some don't)
 */
class ChefsApi {
  constructor() {
    console.log('🔧 Initializing unified CHEFS API service');
    
    // Configuration
    this.config = {
      baseApiUrl: '',
      formId: '',
      apiKey: '',
      timeout: 30000
    };

    // File operation state
    this.authToken = null;

    // Create axios instances for different purposes
    this.createApiClients();
  }

  /**
   * Create axios clients with different configurations
   */
  createApiClients() {
    // Main API client (for form operations - requires auth)
    this.apiClient = axios.create({
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // File API client (for file operations - auth handled per route)
    this.fileClient = axios.create({
      timeout: this.config.timeout
    });

    // Always use proxy to avoid CORS issues
    console.log('🔧 Using proxy URLs to avoid CORS issues');
    this.apiClient.defaults.baseURL = '/api';
    this.fileClient.defaults.baseURL = '/api';

    // Add request interceptor for authentication
    this.setupAuthInterceptors();
  }

  /**
   * Setup authentication interceptors
   */
  setupAuthInterceptors() {
    // Main API client - always add auth headers
    this.apiClient.interceptors.request.use(
      (config) => {
        if (this.authToken) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        } else if (this.config.apiKey && this.config.formId) {
          // Use Basic auth for CHEFS API
          config.headers.Authorization = `Basic ${btoa(`${this.config.formId}:${this.config.apiKey}`)}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // File client - conditional auth based on route
    this.fileClient.interceptors.request.use(
      (config) => {
        // Routes that require authentication
        const authRoutes = ['/files', '/submissions'];
        const requiresAuth = authRoutes.some(route => config.url?.includes(route));
        
        if (requiresAuth) {
          if (this.authToken) {
            config.headers.Authorization = `Bearer ${this.authToken}`;
          } else if (this.config.apiKey && this.config.formId) {
            config.headers.Authorization = `Basic ${btoa(`${this.config.formId}:${this.config.apiKey}`)}`;
          }
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptors for error handling
    [this.apiClient, this.fileClient].forEach(client => {
      client.interceptors.response.use(
        (response) => response,
        (error) => {
          console.error('🔥 CHEFS API Error:', {
            status: error.response?.status,
            message: error.message,
            url: error.config?.url
          });

          // Attach the backend error detail to the error object for FormIO compatibility
          if (error.response && error.response.data) {
            error.detail = error.response.data.detail || error.response.data;
          }

          return Promise.reject(error);
        }
      );
    });
  }

  /**
   * Initialize the service with configuration
   */
  initialize(config) {
    console.log('🔧 Configuring CHEFS API service');
    
    this.config = {
      ...this.config,
      ...config
    };

    // Recreate clients with new configuration
    this.createApiClients();
    
    console.log('✅ CHEFS API service configured:', {
      baseApiUrl: this.config.baseApiUrl,
      formId: this.config.formId ? '***SET***' : 'NOT_SET',
      apiKey: this.config.apiKey ? '***SET***' : 'NOT_SET'
    });
  }

  /**
   * Set authentication credentials
   */
  setCredentials(formId, apiKey) {
    console.log('🔐 Setting CHEFS API credentials');
    this.config.formId = formId;
    this.config.apiKey = apiKey;
  }

  /**
   * Set base API URL and update client base URLs
   */
  setBaseUrl(baseApiUrl) {
    console.log('🌐 Setting CHEFS API base URL:', baseApiUrl);
    this.config.baseApiUrl = baseApiUrl;
    
    // Update both API clients with new base URL
    this.apiClient.defaults.baseURL = baseApiUrl;
    this.fileClient.defaults.baseURL = baseApiUrl;
  }

  /**
   * Set bearer token for authentication
   */
  setAuthToken(token) {
    console.log('🔐 Setting bearer token');
    this.authToken = token;
  }

  // ========================================
  // FORM OPERATIONS
  // ========================================

  /**
   * Get form module versions from CHEFS
   */
  async getFormModuleVersions(formId, formVersionId) {
    try {
      console.log('📋 Fetching form module versions from CHEFS API');
      const response = await this.apiClient.get(`/forms/${formId}/versions/${formVersionId}/formModuleVersions`);
      console.log('✅ Form module versions retrieved successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Failed to fetch form module versions:', error);
      throw error;
    }
  }

  /**
   * Get form schema from CHEFS
   */
  async getFormSchema(formId) {
    try {
      console.log(`📋 Fetching form schema for form: ${formId}`);
      const response = await this.apiClient.get(`/forms/${formId}/version`);
      console.log('✅ Form schema retrieved successfully');
      
      // Extract the actual FormIO schema from CHEFS response
      // CHEFS API returns form metadata with a versions array containing the actual schema
      const formData = response.data;
      
      if (formData.versions && formData.versions.length > 0) {
        // Get the first (usually current) version's schema
        const version = formData.versions[0];
        if (version.schema) {
          console.log('📋 Extracted FormIO schema from CHEFS version data');
          return version.schema;
        }
      }
      
      // Fallback: return the raw response if no versions array
      console.log('📋 Using raw response as schema (no versions array found)');
      return formData;
      
    } catch (error) {
      console.error('❌ Failed to fetch form schema:', error);
      throw error;
    }
  }

  // ========================================
  // FILE OPERATIONS
  // ========================================

  async uploadFile(file, options = {}) {
    const uploadConfig = {
      ...options,
      formId: this.config.formId,
    };
    const response = await this.fileClient.post(`/files?formId=${this.config.formId}`, file, {
      headers: { 'Content-Type': 'multipart/form-data' },
      ...uploadConfig,
    });
    return response.data;
  }

  async getFile(fileId, options = {}) {
    const response = await this.fileClient.get(`/files/${fileId}`, { responseType: 'blob', ...options });
    return response.data;
  }


  /**
   * Actually delete a file from CHEFS (internal method)
   */
  async deleteFile(fileId) {
    const response = await this.fileClient.delete(`/files/${fileId}`);
    return response.data;
  }

  // ========================================
  // COMPONENT INTEGRATION
  // ========================================

  /**
   * Get component options for FormIO components
   */
  getComponentOptions() {
    console.log('📁 CHEFS API: Getting component options for BC Gov components');
    console.log('📁 Current config:', {
      baseApiUrl: this.config.baseApiUrl,
      formId: this.config.formId ? '***SET***' : 'NOT_SET',
      apiKey: this.config.apiKey ? '***SET***' : 'NOT_SET'
    });

    // Use proxy URL for development to avoid CORS issues
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const apiUrl = isDevelopment 
      ? '/api/files'  // Use Vite proxy with relative path
      : `${this.config.baseApiUrl}/files`; // Use direct URL in production
    
    console.log(`📁 Using ${isDevelopment ? 'proxy' : 'direct'} URL for API requests: ${apiUrl}`);
    
    const options = {
      simplefile: {
        // Additional CHEFS-specific configuration
        config: {
          timeout: 30000,
          // Upload configuration for the new component
          uploads: {
            enabled: true,
            fileMinSize: '0KB',
            fileMaxSize: '1GB',
            path: 'files'
          },
          // API configuration
          basePath: '',
          apiPath: 'api/v1'
        },
        // Auth configuration - this should be used by the component for headers
        auth: {
          type: 'basic',
          credentials: btoa(`${this.config.formId}:${this.config.apiKey}`)
        },
        // Function-based approach for compatibility
        uploadFile: this.uploadFile.bind(this),
        deleteFile: this.deleteFile.bind(this),
        getFile: this.getFile.bind(this),
        chefsToken: this.getCurrentAuthHeader.bind(this),
        // Also provide direct access to config values
        baseUrl: this.config.baseApiUrl,
      }
    };

    console.log('📁 Component options created for BC Gov components:', options);
    return options;
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Get current auth header
   */
  getCurrentAuthHeader() {
    if (this.authToken) {
      return `Bearer ${this.authToken}`;
    } else if (this.config.apiKey && this.config.formId) {
      return `Basic ${btoa(`${this.config.formId}:${this.config.apiKey}`)}`;
    }
    return null;
  }

  /**
   * Get configuration object (for debugging)
   */
  getConfig() {
    return {
      ...this.config,
      apiKey: this.config.apiKey ? '***SET***' : 'NOT_SET'
    };
  }
}

// Create singleton instance
const chefsApi = new ChefsApi();

export { chefsApi, ChefsApi };
export default chefsApi;
