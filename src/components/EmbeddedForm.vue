<template>
  <div class="embedded-form">
    <!-- Configuration Status -->
    <ConfigurationStatus 
      v-if="showConfig" 
      :config="formConfig"
      :is-configured="isFullyConfigured"
      @configuration-changed="handleConfigurationChange"
    />

    <!-- Main Content Area -->
    <div class="main-content">
      <!-- Form Section -->
      <div class="form-section">
        <!-- Loading State -->
        <div v-if="loading" class="loading">
          <div class="spinner"></div>
          <p>{{ loadingMessage }}</p>
        </div>

        <!-- Error State -->
        <div v-if="error" class="error">
          <h4>❌ Error Loading Form</h4>
          <p>{{ error }}</p>
          <button @click="retryLoad" class="btn-retry">Retry</button>
        </div>

        <!-- Form Container -->
        <div v-if="isFormReady && !loading && !error" class="form-container">
          <FormIORenderer
            :schema="formSchema"
            :module-version="selectedFormModuleVersion"
            :api-config="{
              baseApiUrl: formConfig.baseApiUrl,
              formId: formConfig.formId,
              apiKey: formConfig.apiKey
            }"
            @submit="handleFormSubmission"
            @ready="handleFormReady"
            @error="handleFormError"
          />
          
          <!-- Form submission result -->
          <div v-if="submissionData" class="submission-result">
            <h4>✅ Form Submitted Successfully!</h4>
            <div class="submission-data">
              <h5>Submission Data:</h5>
              <pre>{{ JSON.stringify(submissionData, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useChefsFormStore } from '../stores/chefsForm.js';
import FormIORenderer from './FormIORenderer.vue';
import ConfigurationStatus from './ConfigurationStatus.vue';
import config from '../config/index.js';

const props = defineProps({
  showConfig: {
    type: Boolean,
    default: () => config.debugMode
  },
  autoLoad: {
    type: Boolean,
    default: true
  }
});

// Use the store
const store = useChefsFormStore();

// Destructure reactive state using storeToRefs
const {
  loading,
  error,
  selectedFormModuleVersion,
  formSchema,
  submissionData,
  isFormReady,
  formConfig,
  isFullyConfigured
} = storeToRefs(store);

// Destructure actions (these don't need storeToRefs)
const {
  initializeForm,
  setSubmissionData,
  setFormReady,
  setCredentials,
  setApiUrl,
  setFormIdentifiers,
  reset
} = store;

const loadingMessage = ref('Initializing...');

const initializeFormData = async () => {
  console.log('EmbeddedForm: initializeFormData called');
  console.log('EmbeddedForm: isFullyConfigured =', isFullyConfigured);
  
  if (!isFullyConfigured) {
    error.value = 'Form configuration is incomplete. Please check environment variables.';
    console.error('EmbeddedForm: Configuration incomplete');
    return;
  }

  try {
    loadingMessage.value = 'Fetching form configuration...';
    console.log('EmbeddedForm: Starting form initialization...');
    
    const result = await initializeForm();
    console.log('EmbeddedForm: Form data initialized:', result);
    
    loadingMessage.value = 'Form ready to render...';
    
    // Set form ready so the FormIO renderer can mount
    console.log('EmbeddedForm: Setting form ready to true');
    setFormReady(true);
    
    console.log('EmbeddedForm: Form data ready for rendering');
  } catch (err) {
    console.error('EmbeddedForm: Form initialization error:', err);
    // Error is already set in the store
  }
};

const handleFormSubmission = (data) => {
  console.log('Form submitted:', data);
  setSubmissionData(data);
  
  // Here you would typically send the data to your API
  // For now, we'll just display it
};

const handleFormReady = () => {
  console.log('EmbeddedForm: FormIO renderer reports form is fully rendered and ready');
  loadingMessage.value = '';
};

const handleFormError = (err) => {
  console.error('Form error:', err);
  error.value = `Form rendering error: ${err.message || err}`;
};

const retryLoad = () => {
  reset();
  initializeFormData();
};

const handleConfigurationChange = async (newConfig) => {
  console.log('EmbeddedForm: Configuration changed, reloading...', {
    ...newConfig,
    apiKey: '***REDACTED***'
  });

  try {
    // Show loading state
    loadingMessage.value = 'Applying new configuration...';
    
    // Reset everything first
    reset();
    
    // Update the store with new configuration
    setApiUrl(newConfig.baseApiUrl);
    setCredentials(newConfig.formId, newConfig.apiKey);
    setFormIdentifiers(newConfig.formId, newConfig.formVersionId);
    
    // Wait a moment for the store to update
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Reinitialize with new configuration
    await initializeFormData();
    
    console.log('EmbeddedForm: Configuration applied and form reloaded successfully');
  } catch (err) {
    console.error('EmbeddedForm: Failed to apply new configuration:', err);
    error.value = `Failed to apply configuration: ${err.message}`;
  }
};

onMounted(() => {
  if (props.autoLoad && isFullyConfigured) {
    initializeFormData();
  }
});

// Expose methods for manual control
defineExpose({
  initializeForm: initializeFormData,
  retryLoad,
  reset
});
</script>

<style scoped>
.embedded-form {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
  color: #333;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.main-content {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.main-content.with-debug .form-section {
  flex: 1;
  min-width: 0; /* Allows flex item to shrink below its content size */
}

.main-content.with-debug .debug-section {
  flex: 0 0 400px; /* Fixed width for debug panel */
  max-height: 80vh;
  overflow-y: auto;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.loading {
  text-align: center;
  padding: 40px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 20px;
  color: #721c24;
  text-align: center;
}

.btn-retry {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.btn-retry:hover {
  background-color: #c82333;
}

.form-container {
  background-color: #fff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.submission-result {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  padding: 20px;
  color: #155724;
  margin-top: 20px;
}

.submission-result pre {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 15px;
  overflow-x: auto;
  font-size: 12px;
  color: #333;
}

.debug-status {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  padding: 15px;
  margin-top: 20px;
  color: #856404;
}

.debug-status p {
  margin: 5px 0;
}
</style>
