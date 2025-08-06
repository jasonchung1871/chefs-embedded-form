import { ref, reactive } from 'vue';
import { chefsApi } from '@/services/chefsApi.js';
import config from '@/config/index.js';

/**
 * Composable for managing form module data and state
 */
export function useFormModules() {
  // Reactive state
  const loading = ref(false);
  const error = ref(null);
  const formModules = ref([]);
  const formModuleVersions = ref([]);
  const selectedFormModule = ref(null);
  const selectedFormModuleVersion = ref(null);
  const formSchema = ref(null);

  // Form configuration - initialize with environment variables
  const formConfig = reactive({
    formId: config.formId,
    formVersionId: config.formVersionId,
    apiKey: config.apiKey,
    baseApiUrl: config.apiUrl
  });

  // Set credentials if available in environment
  if (config.formId && config.apiKey) {
    chefsApi.setCredentials(config.formId, config.apiKey);
  }

  /**
   * Set the API base URL
   * @param {string} url - The base URL for the API
   */
  const setApiUrl = (url) => {
    formConfig.baseApiUrl = url;
    // Note: With axios, the baseURL is set in the constructor
    // We'd need to create a new instance to change it
  };

  /**
   * Set form identifiers
   * @param {string} formId - The form ID
   * @param {string} formVersionId - The form version ID
   */
  const setFormIdentifiers = (formId, formVersionId) => {
    formConfig.formId = formId;
    formConfig.formVersionId = formVersionId;
  };

  /**
   * Set API credentials
   * @param {string} formId - The form ID (username)
   * @param {string} apiKey - The API key (password)
   */
  const setCredentials = (formId, apiKey) => {
    formConfig.formId = formId;
    formConfig.apiKey = apiKey;
    chefsApi.setCredentials(formId, apiKey);
  };

  /**
   * Fetch form module versions for the current form version
   */
  const fetchFormModuleVersions = async () => {
    if (!formConfig.formId || !formConfig.formVersionId) {
      error.value = 'Both Form ID and Form Version ID are required';
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const data = await chefsApi.getFormModuleVersions(formConfig.formId, formConfig.formVersionId);
      formModuleVersions.value = data;
      
      // If we have module versions, automatically select the first one
      if (data && data.length > 0) {
        selectedFormModuleVersion.value = data[0];
      }
    } catch (err) {
      error.value = `Failed to fetch form module versions: ${err.message}`;
      console.error('Error fetching form module versions:', err);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetch the form schema for the current form version
   */
  const fetchFormSchema = async () => {
    if (!formConfig.formId || !formConfig.formVersionId) {
      error.value = 'Both Form ID and Form Version ID are required';
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const data = await chefsApi.getFormSchema(formConfig.formId, formConfig.formVersionId);
      formSchema.value = data;
      return data;
    } catch (err) {
      error.value = `Failed to fetch form schema: ${err.message}`;
      console.error('Error fetching form schema:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetch all available form modules
   */
  const fetchFormModules = async () => {
    loading.value = true;
    error.value = null;

    try {
      const data = await chefsApi.getFormModules();
      formModules.value = data;
    } catch (err) {
      error.value = `Failed to fetch form modules: ${err.message}`;
      console.error('Error fetching form modules:', err);
    } finally {
      loading.value = false;
    }
  };

  /**
   * Fetch a specific form module version
   * @param {string} formModuleVersionId - The form module version ID
   */
  const fetchFormModuleVersion = async (formModuleVersionId) => {
    loading.value = true;
    error.value = null;

    try {
      const data = await chefsApi.getFormModuleVersion(formModuleVersionId);
      selectedFormModuleVersion.value = data;
      return data;
    } catch (err) {
      error.value = `Failed to fetch form module version: ${err.message}`;
      console.error('Error fetching form module version:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  /**
   * Load external resources (JS/CSS) from form module version
   * @param {Object} moduleVersion - The form module version object
   */
  const loadExternalResources = async (moduleVersion) => {
    if (!moduleVersion || !moduleVersion.externalUris) {
      console.warn('No external URIs found in module version');
      return;
    }

    const loadPromises = moduleVersion.externalUris.map(uri => {
      return new Promise((resolve, reject) => {
        if (uri.endsWith('.js')) {
          const script = document.createElement('script');
          script.src = uri;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        } else if (uri.endsWith('.css')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = uri;
          document.head.appendChild(link);
          resolve();
        } else {
          resolve(); // Skip unknown file types
        }
      });
    });

    try {
      await Promise.all(loadPromises);
      console.log('All external resources loaded successfully');
    } catch (err) {
      console.error('Failed to load some external resources:', err);
      throw err;
    }
  };

  /**
   * Clear all data
   */
  const reset = () => {
    formModules.value = [];
    formModuleVersions.value = [];
    selectedFormModule.value = null;
    selectedFormModuleVersion.value = null;
    error.value = null;
    loading.value = false;
  };

  return {
    // State
    loading,
    error,
    formModules,
    formModuleVersions,
    selectedFormModule,
    selectedFormModuleVersion,
    formSchema,
    formConfig,

    // Actions
    setApiUrl,
    setFormIdentifiers,
    setCredentials,
    fetchFormModuleVersions,
    fetchFormSchema,
    fetchFormModules,
    fetchFormModuleVersion,
    loadExternalResources,
    reset
  };
}
