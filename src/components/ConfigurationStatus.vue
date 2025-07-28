<template>
  <div class="config-status">
    <div class="config-header">
      <h3>Configuration Settings</h3>
      <button 
        @click="toggleEditMode" 
        class="edit-btn"
        :class="{ active: isEditing }"
      >
        {{ isEditing ? '📝 Editing' : '⚙️ Configure' }}
      </button>
    </div>

    <!-- Read-only mode -->
    <div v-if="!isEditing" class="status-grid">
      <div class="status-item" :class="{ configured: !!config.baseApiUrl }">
        <span class="label">API URL:</span>
        <span class="value">{{ config.baseApiUrl || 'Not configured' }}</span>
      </div>
      <div class="status-item" :class="{ configured: !!config.formId }">
        <span class="label">Form ID:</span>
        <span class="value">{{ config.formId || 'Not configured' }}</span>
      </div>
      <div class="status-item" :class="{ configured: !!config.formVersionId }">
        <span class="label">Form Version:</span>
        <span class="value">{{ config.formVersionId || 'Not configured' }}</span>
      </div>
      <div class="status-item" :class="{ configured: !!config.apiKey }">
        <span class="label">API Key:</span>
        <span class="value">{{ config.apiKey ? '***CONFIGURED***' : 'Not configured' }}</span>
      </div>
    </div>

    <!-- Edit mode -->
    <div v-else class="edit-form">
      <div class="form-grid">
        <div class="form-field">
          <label for="apiUrl">API URL:</label>
          <input 
            id="apiUrl"
            v-model="editableConfig.baseApiUrl" 
            type="text" 
            placeholder="https://chefs-dev.apps.silver.devops.gov.bc.ca/api/v1"
            class="config-input"
          />
        </div>
        
        <div class="form-field">
          <label for="formId">Form ID:</label>
          <input 
            id="formId"
            v-model="editableConfig.formId" 
            type="text" 
            placeholder="44345fa2-346a-4233-bf1f-83a7319922cc"
            class="config-input"
          />
        </div>
        
        <div class="form-field">
          <label for="formVersionId">Form Version ID:</label>
          <input 
            id="formVersionId"
            v-model="editableConfig.formVersionId" 
            type="text" 
            placeholder="f7909e6e-c689-43ba-8cf6-f320c9dd787e"
            class="config-input"
          />
        </div>
        
        <div class="form-field">
          <label for="apiKey">API Key:</label>
          <input 
            id="apiKey"
            v-model="editableConfig.apiKey" 
            type="password" 
            placeholder="Enter your API key"
            class="config-input"
          />
        </div>
      </div>

      <div class="edit-actions">
        <button @click="applyConfiguration" class="apply-btn" :disabled="!isEditedConfigValid">
          🔄 Apply & Reload
        </button>
        <button @click="cancelEdit" class="cancel-btn">
          ❌ Cancel
        </button>
        <button @click="resetToDefaults" class="reset-btn">
          🏠 Reset to .env
        </button>
      </div>
    </div>
    
    <div v-if="!isConfigured && !isEditing" class="config-warning">
      <p><strong>⚠️ Configuration Incomplete</strong></p>
      <p>Click "Configure" to set missing values or check your environment variables.</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import defaultConfig from '../config/index.js';

const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  isConfigured: {
    type: Boolean,
    required: true
  }
});

const emit = defineEmits(['configurationChanged']);

const isEditing = ref(false);
const editableConfig = ref({
  baseApiUrl: '',
  formId: '',
  formVersionId: '',
  apiKey: ''
});

// Initialize editable config with current values
const initEditableConfig = () => {
  editableConfig.value = {
    baseApiUrl: props.config.baseApiUrl || '',
    formId: props.config.formId || '',
    formVersionId: props.config.formVersionId || '',
    apiKey: props.config.apiKey || ''
  };
};

const isEditedConfigValid = computed(() => {
  return editableConfig.value.baseApiUrl && 
         editableConfig.value.formId && 
         editableConfig.value.formVersionId && 
         editableConfig.value.apiKey;
});

const toggleEditMode = () => {
  if (!isEditing.value) {
    initEditableConfig();
  }
  isEditing.value = !isEditing.value;
};

const applyConfiguration = () => {
  if (!isEditedConfigValid.value) {
    alert('Please fill in all configuration fields.');
    return;
  }

  console.log('Applying new configuration:', {
    ...editableConfig.value,
    apiKey: '***REDACTED***'
  });

  // Emit the new configuration to parent
  emit('configurationChanged', { ...editableConfig.value });
  
  isEditing.value = false;
};

const cancelEdit = () => {
  isEditing.value = false;
  initEditableConfig(); // Reset to original values
};

const resetToDefaults = () => {
  editableConfig.value = {
    baseApiUrl: defaultConfig.apiUrl || '',
    formId: defaultConfig.formId || '',
    formVersionId: defaultConfig.formVersionId || '',
    apiKey: defaultConfig.apiKey || ''
  };
};

// Watch for config changes to update editable config
watch(() => props.config, initEditableConfig, { immediate: true });
</script>

<style scoped>
.config-status {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.config-header h3 {
  margin: 0;
}

.edit-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.2s;
}

.edit-btn:hover {
  background-color: #5a6268;
}

.edit-btn.active {
  background-color: #007bff;
}

.edit-btn.active:hover {
  background-color: #0056b3;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 10px;
  margin-bottom: 15px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: #fff;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.status-item.configured {
  border-color: #28a745;
  background-color: #d4edda;
}

.status-item .label {
  font-weight: bold;
}

.status-item .value {
  font-family: monospace;
  font-size: 12px;
}

.edit-form {
  background-color: #fff;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  padding: 20px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.form-field {
  display: flex;
  flex-direction: column;
}

.form-field label {
  font-weight: bold;
  margin-bottom: 5px;
  color: #495057;
}

.config-input {
  padding: 8px 12px;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s;
}

.config-input:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
}

.edit-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.apply-btn {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.2s;
}

.apply-btn:hover:not(:disabled) {
  background-color: #218838;
}

.apply-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
  opacity: 0.6;
}

.cancel-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.cancel-btn:hover {
  background-color: #5a6268;
}

.reset-btn {
  background-color: #ffc107;
  color: #212529;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reset-btn:hover {
  background-color: #e0a800;
}

.config-warning {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  padding: 15px;
  color: #856404;
}
</style>
