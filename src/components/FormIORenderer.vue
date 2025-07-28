<template>
  <div class="formio-renderer">
    <div v-if="isLoading" class="loading">
      {{ loadingMessage }}
    </div>
    
    <div v-if="error" class="error-state">
      <h3>Form Rendering Error</h3>
      <p>{{ error.message }}</p>
      <button @click="retryRender" class="retry-button">Retry</button>
    </div>
    
    <div 
      ref="formContainer" 
      class="form-container"
      v-show="!isLoading && !error"
    ></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Formio } from 'formiojs';
import chefsApi from '../services/chefsApi.js';

console.log('FormIORenderer: Using FormIO 4.17.4 to match BC Gov components');

// DEBUG: Check FormIO version info
console.log('FormIO version info:', {
  version: Formio?.version,
  versionType: typeof Formio?.version,
  versionStringified: JSON.stringify(Formio?.version)
});

// PATCH: Monkey-patch compare-versions to see what's being passed
if (typeof window !== 'undefined') {
  // Also try to patch the compare-versions function more directly
  // We need to wait for FormIO to load and then find the compare function
  setTimeout(() => {
    try {
      // Try to access the internal compare-versions function
      console.log('🔍 Attempting to patch compare-versions within FormIO...');
      
      // Look for the compare function in the global scope or FormIO
      if (window.Formio && typeof window.Formio.Utils === 'object') {
        console.log('🔍 Found FormIO.Utils:', Object.keys(window.Formio.Utils));
      }
    } catch (error) {
      console.log('🔍 Could not access FormIO internals for patching:', error.message);
    }
  }, 100);
}

const props = defineProps({
  schema: {
    type: Object,
    required: true
  },
  moduleVersion: {
    type: Object,
    default: null
  },
  autoRender: {
    type: Boolean,
    default: true
  },
  readOnly: {
    type: Boolean,
    default: false
  },
  apiConfig: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['submit', 'ready', 'error']);

// Reactive state
const formContainer = ref(null);
const formInstance = ref(null);
const isLoading = ref(false);
const error = ref(null);
const loadingMessage = ref('Initializing form...');

const renderForm = async () => {
  console.log('Starting form rendering...');
  isLoading.value = true;
  error.value = null;
  loadingMessage.value = 'Loading form...';
  
  if (!formContainer.value) {
    console.error('Form container not available');
    return;
  }

  try {
    // Clear any existing form instance
    if (formInstance.value) {
      formInstance.value.destroy();
      formInstance.value = null;
    }
    
    // Clear the container
    formContainer.value.innerHTML = '';
    
    // External components are loaded by the store before this renderer is called
    // No need to load them again here to avoid conflicts with environment overrides
    console.log('External components already loaded by store, proceeding with form creation...');
    
    loadingMessage.value = 'Creating form...';
    
    // DEBUG: Examine the form schema for version-related properties
    console.log('🔍 Form schema analysis:');
    console.log('- Schema type:', typeof props.schema);
    console.log('- Schema keys:', props.schema ? Object.keys(props.schema) : 'null');
    
    let schemaToUse = props.schema;
    
    if (props.schema) {
      // Check if this is a CHEFS form metadata object instead of a FormIO schema
      if (props.schema.schema && typeof props.schema.schema === 'object') {
        console.log('🔍 Detected CHEFS form metadata wrapper, extracting FormIO schema');
        console.log('🔍 CHEFS metadata keys:', Object.keys(props.schema));
        console.log('🔍 Inner FormIO schema:', props.schema.schema);
        schemaToUse = props.schema.schema;
      }
      
      // Check for version-related properties
      const versionKeys = Object.keys(schemaToUse).filter(key => 
        key.toLowerCase().includes('version') || key.toLowerCase().includes('ver')
      );
      console.log('🔍 Version-related keys in final schema:', versionKeys);
      
      versionKeys.forEach(key => {
        const value = schemaToUse[key];
        console.log(`🔍 ${key}:`, value, typeof value);
      });
      
      // Create a copy of schema if we need to fix version properties
      let needsCopy = false;
      
      // Check if there's a version property that's not a string
      if (schemaToUse.version !== undefined && typeof schemaToUse.version !== 'string') {
        console.log('🔍 Schema version property needs conversion:', schemaToUse.version, typeof schemaToUse.version);
        needsCopy = true;
      }
      
      // Also check if schema has a formio version that's not a string
      if (schemaToUse.formio !== undefined && typeof schemaToUse.formio !== 'string') {
        console.log('🔍 Schema formio version needs conversion:', schemaToUse.formio, typeof schemaToUse.formio);
        needsCopy = true;
      }
      
      if (needsCopy) {
        console.log('🔍 Creating schema copy with string versions');
        schemaToUse = { ...schemaToUse };
        
        if (schemaToUse.version !== undefined && typeof schemaToUse.version !== 'string') {
          schemaToUse.version = String(schemaToUse.version);
        }
        
        if (schemaToUse.formio !== undefined && typeof schemaToUse.formio !== 'string') {
          schemaToUse.formio = String(schemaToUse.formio);
        }
      }
    }
    
    console.log('Creating FormIO form with schema:', schemaToUse);
    
        // Initialize file service if config is provided
    if (!chefsApi.config.baseApiUrl) {
      // Get configuration from props
      const fileServiceConfig = {
        baseApiUrl: props.apiConfig?.baseApiUrl || 'https://chefs-dev.apps.silver.devops.gov.bc.ca/pr-1736/api/v1',
        formId: props.apiConfig?.formId,
        apiKey: props.apiConfig?.apiKey
      };
      
      console.log('🔧 Initializing CHEFS file service for custom components');
      console.log('🔧 File service config:', {
        baseApiUrl: fileServiceConfig.baseApiUrl,
        formId: fileServiceConfig.formId ? '***SET***' : 'NOT_SET',
        apiKey: fileServiceConfig.apiKey ? '***SET***' : 'NOT_SET'
      });
      
      chefsApi.initialize(fileServiceConfig);
    }
    
    // Create FormIO options with CHEFS file service integration
    const fileServiceOptions = chefsApi.getComponentOptions();
    console.log('🔧 File service component options:', fileServiceOptions);
    console.log('🔧 File service options structure:', JSON.stringify(fileServiceOptions, null, 2));
    
    // Check that the uploadFile function is actually present
    if (fileServiceOptions.simplefile && typeof fileServiceOptions.simplefile.uploadFile === 'function') {
      console.log('✅ uploadFile function is present and is a function');
    } else {
      console.error('❌ uploadFile function is missing or not a function:', 
        typeof fileServiceOptions.simplefile?.uploadFile);
    }
    
    const formOptions = {
      sanitizeConfig: {
        addTags: ['iframe'],
        ALLOWED_TAGS: ['iframe'],
      },
      readOnly: props.readOnly || false,
      // Include CHEFS file service options for custom components
      componentOptions: fileServiceOptions,
      // PATCH: Also try setting options at the form level
      options: fileServiceOptions,
      // Hook into component creation to ensure our options are available
      hooks: {
        beforeComponentCreate: (component, componentInfo) => {
          console.log('🔧 HOOK: beforeComponentCreate called for:', componentInfo?.type, componentInfo?.key);
          
          if (componentInfo?.type === 'simplefile') {
            console.log('🔧 HOOK: Setting up simplefile component options');
            
            // Ensure componentOptions are available globally for this component type
            if (!window.FormioComponentOptions) {
              window.FormioComponentOptions = {};
            }
            
            // Set global component options that BC Gov component can access
            window.FormioComponentOptions.simplefile = fileServiceOptions.simplefile;
            window.FormioComponentOptions[componentInfo.key] = fileServiceOptions.simplefile;
            
            console.log('🔧 HOOK: Global FormioComponentOptions set:', window.FormioComponentOptions);
            
            // Also try to set it directly on the component definition
            if (component && component.options) {
              component.options = {
                ...component.options,
                ...fileServiceOptions.simplefile
              };
              console.log('🔧 HOOK: Set options directly on component');
            }
          }
          
          return component;
        },
        beforeRender: (form) => {
          console.log('🔧 HOOK: beforeRender - setting up global component options');
          
          // Ensure our component options are available globally
          if (!form.options.componentOptions) {
            form.options.componentOptions = {};
          }
          
          form.options.componentOptions = {
            ...form.options.componentOptions,
            ...fileServiceOptions
          };
          
          console.log('🔧 HOOK: beforeRender - component options set:', form.options.componentOptions);
        }
      }
    };
    
    console.log('🔧 FormIO options with CHEFS file service:', formOptions);
    console.log('🔧 FormIO options structure:', JSON.stringify(formOptions, null, 2));
    
    // Create the form
    const form = await Formio.createForm(formContainer.value, schemaToUse, formOptions);
    formInstance.value = form;
    
    // CRITICAL PATCH: Set up component options in the exact way BC Gov components expect
    console.log('🔧 CRITICAL: Setting up componentOptions for BC Gov component access');
    
    // The BC Gov simplefile component accesses options via componentOptions[this.id] 
    // where this.id is the component's unique identifier
    if (!form.options.componentOptions) {
      form.options.componentOptions = {};
    }
    
    // Make sure our file service options are available for all simplefile components
    form.options.componentOptions = {
      ...form.options.componentOptions,
      ...fileServiceOptions
    };
    
    // Also ensure it's available globally on the form instance
    form.componentOptions = form.options.componentOptions;
    
    console.log('🔧 CRITICAL: Form componentOptions set:', form.options.componentOptions);
    console.log('🔧 CRITICAL: Form instance componentOptions set:', form.componentOptions);
    
    // ULTIMATE PATCH: Set global componentOptions that any component can access
    if (typeof window !== 'undefined') {
      if (!window.FormioComponentOptions) {
        window.FormioComponentOptions = {};
      }
      
      // Make our file service options available globally
      window.FormioComponentOptions = {
        ...window.FormioComponentOptions,
        ...fileServiceOptions
      };
      
      console.log('🔧 ULTIMATE: Global window.FormioComponentOptions set:', window.FormioComponentOptions);
    }
    
    // PATCH: Ensure component options are available to all components after form creation
    console.log('🔧 Post-creation: Setting up component options for BC Gov components');
    
    // Walk through all form components and ensure they have access to CHEFS file service
    const setupComponentOptions = (component) => {
      if (component && component.component && component.component.type === 'simplefile') {
        console.log('🔧 Found simplefile component:', component.component.key);
        console.log('🔧 Component ID:', component.id);
        console.log('🔧 Current component config:', component.component);
        
        // Configure the component for CHEFS API
        component.component.storage = 'chefs';
        
        // Use proxy URL in development, direct URL in production
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const apiUrl = isDevelopment 
          ? '/api/files'  // Use Vite proxy with relative path
          : `${chefsApi.config.baseApiUrl}/files`; // Use direct URL in production
        
        component.component.url = apiUrl;
        component.component.fileKey = 'files';
        
        console.log('🔧 Updated component URL to:', component.component.url);
        console.log('🔧 Updated component storage to:', component.component.storage);
        
        // Ensure the component has access to our file service options
        if (!component.options) {
          component.options = {};
        }
        
        // IMPORTANT: Merge our file service functions with existing options, don't overwrite
        const originalOptions = { ...component.options };
        component.options = {
          ...originalOptions,
          ...fileServiceOptions.simplefile,
          // Ensure these specific functions are always present
          uploadFile: fileServiceOptions.simplefile.uploadFile,
          deleteFile: fileServiceOptions.simplefile.deleteFile,
          getFile: fileServiceOptions.simplefile.getFile,
          chefsToken: fileServiceOptions.simplefile.chefsToken,
          // Component options for the new BC Gov component pattern
          componentOptions: {
            [component.component.type]: fileServiceOptions.simplefile
          }
        };
        
        console.log('🔧 Enhanced component options for', component.component.key);
        console.log('🔧 Component URL set to:', component.component.url);
        console.log('🔧 uploadFile function type:', typeof component.options.uploadFile);
        console.log('🔧 deleteFile function type:', typeof component.options.deleteFile);
        console.log('🔧 getFile function type:', typeof component.options.getFile);
        
        // CRITICAL: Also set the options using the component's unique ID
        // This is how BC Gov simplefile component accesses them: componentOptions[this.id]
        if (form && form.options && form.options.componentOptions) {
          form.options.componentOptions[component.id] = fileServiceOptions.simplefile;
          console.log('🔧 CRITICAL: Set componentOptions for ID:', component.id);
        }
        
        // ULTIMATE PATCH: Directly patch the component's upload method if it exists
        if (component.uploadFile && typeof component.uploadFile === 'function') {
          const originalUpload = component.uploadFile.bind(component);
          component.uploadFile = async (...args) => {
            console.log('🔧 ULTIMATE: Component uploadFile intercepted!', args);
            try {
              // Use our CHEFS file service instead
              return await fileServiceOptions.simplefile.uploadFile(...args);
            } catch (error) {
              console.error('🔧 ULTIMATE: Component upload failed, trying original:', error);
              return originalUpload(...args);
            }
          };
          console.log('🔧 ULTIMATE: Patched component uploadFile method');
        }
        
        // Also patch if there's an options.uploadFile method
        if (component.options && component.options.uploadFile && typeof component.options.uploadFile === 'function') {
          console.log('🔧 ULTIMATE: Component already has options.uploadFile');
        } else if (component.options) {
          component.options.uploadFile = fileServiceOptions.simplefile.uploadFile;
          console.log('🔧 ULTIMATE: Set options.uploadFile directly on component');
        }
        
        // Also try setting it on the component instance directly
        if (component.component) {
          component.component.options = component.options;
        }
      }
      
      // Recursively check child components
      if (component.components && Array.isArray(component.components)) {
        component.components.forEach(setupComponentOptions);
      }
      
      // Check nested component structures
      if (component._form && component._form.components) {
        component._form.components.forEach(setupComponentOptions);
      }
    };
    
    // Apply to all components in the form
    if (form.components && Array.isArray(form.components)) {
      form.components.forEach(setupComponentOptions);
    }
    
    // Also listen for component creation events to catch dynamically added components
    form.on('component', (component) => {
      console.log('🔧 New component created:', component.component?.type, component.component?.key);
      if (component.component?.type === 'simplefile') {
        setupComponentOptions(component);
      }
    });
    
    // Set up event listeners
    form.on('submit', (submission) => {
      console.log('Form submitted:', submission);
      emit('submit', submission);
    });
    
    form.on('change', (changed) => {
      console.log('Form changed:', changed);
    });
    
    console.log('✅ Form rendered successfully');
    
    // Set up fetch interception for CHEFS API authentication
    setTimeout(() => {
      console.log('🔧 Setting up fetch interception for CHEFS authentication...');
      
      // Store the original fetch function
      const originalFetch = window.fetch;
      
      // Intercept fetch requests to add CHEFS authentication
      window.fetch = async function(url, options = {}) {
        const urlString = url instanceof URL ? url.toString() : url;
        
        // Check if this is a file request to our CHEFS API (direct or proxy)
        if (urlString.includes('/files') && (
            urlString.includes(chefsApi.config.baseApiUrl) || 
            urlString.includes('/api/files')
          )) {
          console.log('🔧 Intercepted CHEFS file request:', urlString);
          console.log('🔧 Request options:', options);
          
          // Add formId query parameter for CHEFS file uploads
          const url = new URL(urlString, window.location.origin);
          if (!url.searchParams.has('formId')) {
            url.searchParams.set('formId', chefsApi.config.formId);
            console.log('🔧 Added formId query parameter:', chefsApi.config.formId);
          }
          const finalUrl = url.toString();
          console.log('🔧 Final URL with formId:', finalUrl);
          
          // Add authentication headers
          const enhancedOptions = {
            ...options,
            headers: {
              ...options.headers,
              'Authorization': chefsApi.getCurrentAuthHeader(),
              'X-API-KEY': chefsApi.getApiKeyHeader() // Try API key header too
            }
          };
          
          // Remove Content-Type header for FormData uploads (let browser set it)
          if (enhancedOptions.body instanceof FormData) {
            delete enhancedOptions.headers['Content-Type'];
            console.log('🔧 Removed Content-Type for FormData upload');
          }
          
          console.log('🔧 Enhanced fetch options:', enhancedOptions);
          console.log('🔧 Auth header:', chefsApi.getCurrentAuthHeader());
          
          try {
            const response = await originalFetch(finalUrl, enhancedOptions);
            console.log('🔧 CHEFS response:', response.status, response.statusText);
            
            if (!response.ok) {
              console.error('🔧 CHEFS request failed:', response.status, response.statusText);
              const errorText = await response.text();
              console.error('🔧 Error response body:', errorText);
            }
            
            return response;
          } catch (error) {
            console.error('🔧 CHEFS request error:', error);
            throw error;
          }
        }
        
        // For all other requests, use the original fetch
        return originalFetch(url, options);
      };
      
      console.log('✅ Fetch interception set up successfully');
    }, 1000);
    
    emit('ready', form);
    isLoading.value = false;
    
  } catch (err) {
    console.error('Error rendering form:', err);
    error.value = err;
    isLoading.value = false;
    emit('error', err);
  }
};

const retryRender = () => {
  error.value = null;
  renderForm();
};

const destroyForm = () => {
  if (formInstance.value) {
    try {
      formInstance.value.destroy();
      formInstance.value = null;
    } catch (err) {
      console.error('Error destroying form:', err);
    }
  }
};

// Watch for schema changes
watch(() => props.schema, (newSchema) => {
  if (newSchema) {
    console.log('FormIORenderer: Schema changed, re-rendering...');
    nextTick(() => {
      renderForm();
    });
  }
});

// Component lifecycle
onMounted(() => {
  console.log('FormIORenderer: Component mounted');
  
  if (props.autoRender && props.schema) {
    console.log('FormIORenderer: Auto-rendering form');
    nextTick(() => {
      renderForm();
    });
  }
});

onUnmounted(() => {
  console.log('FormIORenderer: Component unmounting');
  destroyForm();
});

// Expose methods for parent components
defineExpose({
  renderForm,
  destroyForm,
  retryRender
});
</script>

<style scoped>
.formio-renderer {
  width: 100%;
  min-height: 200px;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  font-size: 16px;
  color: #666;
}

.error-state {
  padding: 20px;
  border: 1px solid #dc3545;
  border-radius: 4px;
  background-color: #f8d7da;
  color: #721c24;
}

.error-state h3 {
  margin-top: 0;
  color: #721c24;
}

.retry-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.retry-button:hover {
  background-color: #c82333;
}

.form-container {
  width: 100%;
}
</style>
