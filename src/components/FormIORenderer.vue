<template>
  <div class="formio-renderer">
    <div v-if="isLoading" class="loading">{{ loadingMessage }}</div>
    <div v-if="error" class="error-state">
      <h3>Form Rendering Error</h3>
      <p>{{ error.message }}</p>
      <button @click="retryRender" class="retry-button">Retry</button>
    </div>
    <div ref="formContainer" class="form-container" v-show="!isLoading && !error"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Formio } from 'formiojs';
import chefsApi from '@/services/chefsApi.js';

const props = defineProps({
  schema: { type: Object, required: true },
  moduleVersion: { type: Object, default: null },
  apiConfig: { type: Object, default: null },
  autoRender: { type: Boolean, default: true },
  readOnly: { type: Boolean, default: false }
});

const emit = defineEmits(['submit', 'ready', 'error']);

const formContainer = ref(null);
const formInstance = ref(null);
const isLoading = ref(false);
const error = ref(null);
const loadingMessage = ref('Loading form...');

const renderForm = async () => {
  isLoading.value = true;
  error.value = null;
  loadingMessage.value = 'Loading form...';

  if (!formContainer.value) return;

  try {
    if (formInstance.value) {
      formInstance.value.destroy();
      formInstance.value = null;
    }
    formContainer.value.innerHTML = '';

    // Initialize chefsApi with apiConfig if provided
    if (props.apiConfig && props.apiConfig.baseApiUrl) {
      chefsApi.initialize(props.apiConfig);
    }

    // Get componentOptions from chefsApi
    const componentOptions = chefsApi.getComponentOptions();

    const formOptions = {
      readOnly: props.readOnly,
      componentOptions
    };

    formInstance.value = await Formio.createForm(formContainer.value, props.schema, formOptions);

    formInstance.value.on('submit', submission => emit('submit', submission));
    emit('ready', formInstance.value);
    isLoading.value = false;
  } catch (err) {
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
    } catch (err) {}
  }
};

watch(() => props.schema, (newSchema) => {
  if (newSchema) nextTick(() => renderForm());
});

onMounted(() => {
  if (props.autoRender && props.schema) nextTick(() => renderForm());
});

onUnmounted(() => destroyForm());

defineExpose({ renderForm, destroyForm, retryRender });
</script>

<style scoped>
.formio-renderer { width: 100%; min-height: 200px; }
.loading { display: flex; align-items: center; justify-content: center; min-height: 200px; font-size: 16px; color: #666; }
.error-state { padding: 20px; border: 1px solid #dc3545; border-radius: 4px; background-color: #f8d7da; color: #721c24; }
.retry-button { background-color: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-top: 10px; }
.retry-button:hover { background-color: #c82333; }
.form-container { width: 100%; }
</style>