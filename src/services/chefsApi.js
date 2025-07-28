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
    this.pendingUploads = new Map();
    this.pendingDeletes = new Set();
    this.uploadedFiles = new Map();
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
          config.headers['X-API-KEY'] = this.config.apiKey;
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
            config.headers['X-API-KEY'] = this.config.apiKey;
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

  /**
   * Upload a file to CHEFS (queued approach for CHEFS compatibility)
   */
  async uploadFile(file, options = {}) {
    try {
      console.log('📁 CHEFS API: Queueing file for upload on submission');
      console.log('📁 File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Generate temporary ID for tracking
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store file for later upload
      this.pendingUploads.set(tempId, {
        file: file,
        config: options
      });

      console.log('📁 File queued with temp ID:', tempId);

      // Return temp result that FormIO expects
      return {
        storage: 'chefs',
        name: file.name,
        size: file.size,
        type: file.type,
        url: `/files/${tempId}`,
        data: {
          id: tempId,
          storage: 'chefs'
        }
      };

    } catch (error) {
      console.error('❌ File upload queuing failed:', error);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Actually upload a file to CHEFS (internal method)
   */
  async _actualUploadFile(file, config = {}) {
    const formData = new FormData();
    formData.append('file', file);

    // Add any additional config as form data
    Object.keys(config).forEach(key => {
      if (config[key] !== undefined && config[key] !== null) {
        formData.append(key, config[key]);
      }
    });

    const response = await this.fileClient.post('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  }

  /**
   * Get/download a file from CHEFS
   */
  async getFile(fileId, options = {}) {
    try {
      console.log('📁 CHEFS API: Getting file:', fileId);

      // Handle temp files (not yet uploaded)
      if (fileId.startsWith('temp_')) {
        const uploadData = this.pendingUploads.get(fileId);
        if (uploadData) {
          console.log('📁 Returning temp file data');
          return {
            data: uploadData.file,
            headers: {
              'content-type': uploadData.file.type,
              'content-disposition': `attachment; filename="${uploadData.file.name}"`
            }
          };
        } else {
          throw new Error('Temp file not found');
        }
      }

      // For real files, make API request
      const config = {
        responseType: options.responseType || 'blob',
        ...options
      };

      const response = await this.fileClient.get(`/files/${fileId}`, config);
      console.log('✅ File retrieved successfully');
      return response;

    } catch (error) {
      console.error('❌ File retrieval failed:', error);
      throw error;
    }
  }

  /**
   * Delete a file from CHEFS (queued approach)
   */
  async deleteFile(fileId) {
    try {
      console.log('📁 CHEFS API: Queueing file for deletion on submission');

      // Handle different file ID formats
      let actualFileId = fileId;
      if (typeof fileId === 'object') {
        if (fileId.data?.id) {
          actualFileId = fileId.data.id;
        } else if (fileId.id) {
          actualFileId = fileId.id;
        }
      }

      if (!actualFileId) {
        throw new Error('Invalid file ID provided for deletion');
      }

      console.log('📁 File queued for deletion:', actualFileId);

      // If it's a temp file, just remove it from pending uploads
      if (actualFileId.startsWith('temp_')) {
        this.pendingUploads.delete(actualFileId);
        console.log('📁 Removed temp file from upload queue');
      } else {
        // Queue real file for deletion
        this.pendingDeletes.add(actualFileId);
        console.log('📁 Real file queued for deletion');
      }

      return { success: true, id: actualFileId };

    } catch (error) {
      console.error('❌ File deletion queuing failed:', error);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  /**
   * Actually delete a file from CHEFS (internal method)
   */
  async _actualDeleteFile(fileId) {
    const response = await this.fileClient.delete(`/files/${fileId}`);
    return response.data;
  }

  /**
   * Process all pending file operations (called on form submission)
   */
  async processPendingFileOperations() {
    console.log('📁 Processing pending file operations...');
    console.log('📁 Pending uploads:', this.pendingUploads.size);
    console.log('📁 Pending deletes:', this.pendingDeletes.size);

    const results = {
      uploads: {},
      deletes: [],
      errors: []
    };

    // Process uploads
    for (const [tempId, uploadData] of this.pendingUploads) {
      try {
        console.log('📁 Uploading file:', uploadData.file.name);
        const result = await this._actualUploadFile(uploadData.file, uploadData.config);
        results.uploads[tempId] = result;
        this.uploadedFiles.set(tempId, result);
        console.log('✅ File uploaded successfully:', result);
      } catch (error) {
        console.error('❌ Upload failed for:', uploadData.file.name, error);
        results.errors.push({
          type: 'upload',
          tempId: tempId,
          fileName: uploadData.file.name,
          error: error.message
        });
      }
    }

    // Process deletes
    for (const fileId of this.pendingDeletes) {
      try {
        console.log('📁 Deleting file:', fileId);
        await this._actualDeleteFile(fileId);
        results.deletes.push(fileId);
        console.log('✅ File deleted successfully');
      } catch (error) {
        console.error('❌ Delete failed for:', fileId, error);
        results.errors.push({
          type: 'delete',
          fileId: fileId,
          error: error.message
        });
      }
    }

    // Clear pending operations
    this.pendingUploads.clear();
    this.pendingDeletes.clear();

    console.log('📁 File operations processing complete:', results);
    return results;
  }

  /**
   * Handle file download with automatic browser download
   */
  async downloadFileToUser(fileId, options = {}) {
    try {
      const fileResponse = await this.getFile(fileId, options);
      
      if (!fileResponse || !fileResponse.headers) {
        throw new Error('Invalid file response');
      }

      let data = fileResponse.data;

      // Handle JSON responses
      if (fileResponse.headers['content-type']?.includes('application/json')) {
        data = JSON.stringify(data);
      }

      // Convert to blob if needed
      if (typeof data === 'string') {
        data = new Blob([data], {
          type: fileResponse.headers['content-type']
        });
      }

      // Create download link
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      
      // Extract filename from content-disposition header
      const disposition = fileResponse.headers['content-disposition'];
      a.download = this.getDisposition(disposition);
      
      a.style.display = 'none';
      a.classList.add('hiddenDownloadTextElement');
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
      }, 100);

    } catch (error) {
      console.error('❌ File download to user failed:', error);
      throw error;
    }
  }

  /**
   * Extract filename from content-disposition header
   */
  getDisposition(disposition) {
    if (!disposition) return 'download';
    
    const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
    if (filenameMatch && filenameMatch[1]) {
      return filenameMatch[1].replace(/['"]/g, '');
    }
    return 'download';
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
        // URL configuration for the component's upload method
        url: apiUrl,
        // Storage configuration
        storage: 'chefs',
        // File handling configuration
        fileKey: 'file', // The form field name for file uploads
        // Additional CHEFS-specific configuration
        config: {
          baseApiUrl: this.config.baseApiUrl,
          formId: this.config.formId,
          apiKey: this.config.apiKey,
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
        apiKey: this.config.apiKey,
        formId: this.config.formId
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
   * Get API key for X-API-KEY header
   */
  getApiKeyHeader() {
    return this.config.apiKey;
  }

  /**
   * Get the current state of pending operations
   */
  getPendingOperations() {
    return {
      pendingUploads: Array.from(this.pendingUploads.keys()),
      pendingDeletes: Array.from(this.pendingDeletes),
      uploadedFiles: Array.from(this.uploadedFiles.keys())
    };
  }

  /**
   * Clear all pending operations (useful for form reset)
   */
  clearPendingOperations() {
    this.pendingUploads.clear();
    this.pendingDeletes.clear();
    this.uploadedFiles.clear();
    console.log('📁 All pending file operations cleared');
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
