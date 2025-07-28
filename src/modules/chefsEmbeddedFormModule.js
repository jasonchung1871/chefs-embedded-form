/**
 * CHEFS Embedded Form Module
 * 
 * This is an example of how to use the CHEFS file service and embedded forms
 * in a standalone application. This module can be imported and used independently.
 */

import { chefsApi } from '@/services/chefsApi.js';
import { componentLoader } from '@/services/componentLoader.js';
import { Formio } from '@formio/js';

class ChefsEmbeddedForm {
  constructor() {
    this.formInstance = null;
    this.container = null;
    this.config = {};
  }

  /**
   * Initialize CHEFS embedded form
   */
  async initialize(config) {
    this.config = {
      baseApiUrl: 'https://chefs-dev.apps.silver.devops.gov.bc.ca/pr-1736/api/v1',
      ...config
    };

    // Initialize file service
    chefsApi.initialize({
      baseApiUrl: this.config.baseApiUrl,
      formId: this.config.formId,
      apiKey: this.config.apiKey
    });

    // Initialize component loader
    componentLoader.initialize(Formio);

    console.log('✅ CHEFS Embedded Form initialized');
  }

  /**
   * Load and render a CHEFS form
   */
  async renderForm(containerElement, formSchema, externalUris = []) {
    try {
      this.container = containerElement;

      // Load external BC Gov components if provided
      if (externalUris.length > 0) {
        console.log('📦 Loading external BC Gov components...');
        await componentLoader.loadExternalComponents(externalUris);
      }

      // Extract actual FormIO schema if wrapped in CHEFS metadata
      let schemaToUse = formSchema;
      if (formSchema.schema && typeof formSchema.schema === 'object') {
        console.log('🔧 Extracting FormIO schema from CHEFS metadata');
        schemaToUse = formSchema.schema;
      }

      // Create FormIO options with CHEFS file service
      const formOptions = {
        sanitizeConfig: {
          addTags: ['iframe'],
          ALLOWED_TAGS: ['iframe'],
        },
        readOnly: this.config.readOnly || false,
        componentOptions: {
          ...chefsApi.getComponentOptions(),
        }
      };

      console.log('🔧 Creating FormIO form with CHEFS integration...');
      
      // Create the form
      this.formInstance = await Formio.createForm(
        this.container, 
        schemaToUse, 
        formOptions
      );

      // Set up event listeners
      this.formInstance.on('submit', (submission) => {
        console.log('📝 Form submitted:', submission);
        if (this.config.onSubmit) {
          this.config.onSubmit(submission);
        }
      });

      this.formInstance.on('change', (changed) => {
        console.log('📝 Form changed:', changed);
        if (this.config.onChange) {
          this.config.onChange(changed);
        }
      });

      console.log('✅ CHEFS form rendered successfully');
      return this.formInstance;

    } catch (error) {
      console.error('❌ Failed to render CHEFS form:', error);
      throw error;
    }
  }

  /**
   * Destroy the form instance
   */
  destroy() {
    if (this.formInstance) {
      this.formInstance.destroy();
      this.formInstance = null;
    }
  }

  /**
   * Get the current form submission data
   */
  getSubmissionData() {
    return this.formInstance?.submission || null;
  }

  /**
   * Set form submission data
   */
  setSubmissionData(data) {
    if (this.formInstance) {
      this.formInstance.submission = { data };
    }
  }
}

// Example usage:
/*
import { ChefsEmbeddedForm } from './chefsEmbeddedFormModule.js';

const chefsForm = new ChefsEmbeddedForm();

// Initialize with your CHEFS configuration
await chefsForm.initialize({
  baseApiUrl: 'https://chefs-dev.apps.silver.devops.gov.bc.ca/pr-1736/api/v1',
  formId: 'your-form-id',
  apiKey: 'your-api-key',
  onSubmit: (submission) => {
    console.log('Form submitted!', submission);
  },
  onChange: (changed) => {
    console.log('Form changed!', changed);
  }
});

// Render the form
const formSchema = {
  // Your CHEFS form schema here
};

const externalUris = [
  'https://jasonchung1871.github.io/chefs_modules/bcgov-formio-components.use.min.js'
];

await chefsForm.renderForm(
  document.getElementById('form-container'),
  formSchema,
  externalUris
);
*/

export { ChefsEmbeddedForm, chefsApi };
export default ChefsEmbeddedForm;
