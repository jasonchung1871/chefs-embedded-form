import { defineStore } from 'pinia';
import { ref, computed, reactive } from 'vue';
import { chefsApi } from '../services/chefsApi.js';
import config from '../config/index.js';
import { componentLoader } from '../services/componentLoader.js';
import { Formio } from 'formiojs';

// Make Formio available globally for external components
if (typeof window !== 'undefined') {
  window.Formio = Formio;
  
  // Initialize component loader with FormIO instance
  componentLoader.initialize(Formio);
}

export const useChefsFormStore = defineStore('chefsForm', () => {
  // State
  const loading = ref(false);
  const error = ref(null);
  const formModules = ref([]);
  const formModuleVersions = ref([]);
  const selectedFormModule = ref(null);
  const selectedFormModuleVersion = ref(null);
  const formSchema = ref(null);
  const submissionData = ref(null);
  const isFormReady = ref(false);

  // Form configuration
  const formConfig = reactive({
    formId: config.formId,
    formVersionId: config.formVersionId,
    apiKey: config.apiKey,
    baseApiUrl: config.apiUrl
  });

  // Initialize API credentials if available
  if (config.formId && config.apiKey) {
    chefsApi.setCredentials(config.formId, config.apiKey);
  }

  // Computed
  const isFullyConfigured = computed(() => {
    return !!(
      formConfig.baseApiUrl &&
      formConfig.formId &&
      formConfig.formVersionId &&
      formConfig.apiKey
    );
  });

  const hasExternalResources = computed(() => {
    return selectedFormModuleVersion.value?.formModuleVersion?.externalUris?.length > 0;
  });

  // Actions
  const setCredentials = (formId, apiKey) => {
    formConfig.formId = formId;
    formConfig.apiKey = apiKey;
    chefsApi.setCredentials(formId, apiKey);
  };

  const setApiUrl = (apiUrl) => {
    formConfig.baseApiUrl = apiUrl;
    chefsApi.setBaseUrl(apiUrl);
  };

  const setFormIdentifiers = (formId, formVersionId) => {
    formConfig.formId = formId;
    formConfig.formVersionId = formVersionId;
  };

  const fetchFormModuleVersions = async () => {
    if (!formConfig.formId || !formConfig.formVersionId) {
      error.value = 'Both Form ID and Form Version ID are required';
      throw new Error(error.value);
    }

    loading.value = true;
    error.value = null;

    try {
      const data = await chefsApi.getFormModuleVersions(formConfig.formId, formConfig.formVersionId);
      formModuleVersions.value = data;
      
      // Automatically select the first module version
      if (data && data.length > 0) {
        selectedFormModuleVersion.value = data[0];
      }
      
      return data;
    } catch (err) {
      error.value = `Failed to fetch form module versions: ${err.message}`;
      console.error('Error fetching form module versions:', err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const fetchFormSchema = async () => {
    if (!formConfig.formId || !formConfig.formVersionId) {
      error.value = 'Both Form ID and Form Version ID are required';
      throw new Error(error.value);
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

  const loadExternalResources = async () => {
    try {
      let externalUris = selectedFormModuleVersion.value?.formModuleVersion?.externalUris || [];
      console.log('External resources available:', externalUris);
      
      // DEVELOPMENT OVERRIDE: Use local file for testing
      if (import.meta.env.MODE === 'development' && import.meta.env.VITE_USE_LOCAL_COMPONENTS === 'true') {
        console.log('🔧 DEVELOPMENT MODE: Using local BC Gov components file');
        externalUris = ['/bcgov-formio-components.use.min.js'];
        console.log('🔧 Overridden external URIs:', externalUris);
      }
      
      if (externalUris.length === 0) {
        console.log('No external resources to load');
        return { success: true, results: [] };
      }
      
      // Use the component loader service for robust component management
      console.log('Loading external components for full CHEFS compatibility...');
      const loadResults = await componentLoader.loadExternalComponents(externalUris);
      
      console.log('Component loading results:', loadResults);
      console.log('Component loader status:', componentLoader.getStatus());
      
      return loadResults;
      
    } catch (error) {
      console.error('Error loading external resources:', error);
      // Don't fail completely - allow fallback to standard components
      console.warn('Continuing with standard FormIO components only');
      return { success: false, error: error.message };
    }
  };

  const loadFormIOLibrary = async () => {
    try {
      console.log('FormIO library loaded via ES6 import');
      
      // DEBUG: Check version before and after assignment
      console.log('FormIO version (original):', Formio?.version, typeof Formio?.version);
      
      // If FormIO version is not a proper string, set a default
      if (!Formio.version || typeof Formio.version !== 'string' || Formio.version === 'FORMIO_VERSION') {
        console.log('Setting default FormIO version due to invalid/missing version');
        Formio.version = '5.0.0-rc.86'; // Set to the version we installed
      }
      
      console.log('FormIO version (after check):', Formio?.version || 'version not available');
      
      // Make Formio available globally for external components
      if (typeof window !== 'undefined') {
        window.Formio = Formio;
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error with FormIO library:', error);
      throw error;
    }
  };

  const setSubmissionData = (data) => {
    submissionData.value = data;
  };

  const setFormReady = (ready) => {
    isFormReady.value = ready;
  };

  const reset = () => {
    loading.value = false;
    error.value = null;
    formModules.value = [];
    formModuleVersions.value = [];
    selectedFormModule.value = null;
    selectedFormModuleVersion.value = null;
    formSchema.value = null;
    submissionData.value = null;
    isFormReady.value = false;
  };

  const initializeForm = async () => {
    if (!isFullyConfigured.value) {
      error.value = 'Form configuration is incomplete. Please check environment variables.';
      throw new Error(error.value);
    }

    try {
      // Fetch form module versions first to check for external resources
      await fetchFormModuleVersions();

      if (formModuleVersions.value.length === 0) {
        throw new Error('No form module versions found for this form');
      }

      // Load external resources first (these contain FormIO + custom components)
      await loadExternalResources();

      // Only load base FormIO if no external resources provided it
      await loadFormIOLibrary();

      // Fetch the form schema
      await fetchFormSchema();

      if (!formSchema.value) {
        throw new Error('No form schema found for this form version');
      }

      return {
        moduleVersion: selectedFormModuleVersion.value,
        schema: formSchema.value
      };
    } catch (err) {
      error.value = `Failed to initialize form: ${err.message}`;
      console.error('Form initialization error:', err);
      throw err;
    }
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
    submissionData,
    isFormReady,
    formConfig,

    // Computed
    isFullyConfigured,
    hasExternalResources,

    // Actions
    setCredentials,
    setApiUrl,
    setFormIdentifiers,
    fetchFormModuleVersions,
    fetchFormSchema,
    loadExternalResources,
    loadFormIOLibrary,
    setSubmissionData,
    setFormReady,
    initializeForm,
    reset
  };
});
