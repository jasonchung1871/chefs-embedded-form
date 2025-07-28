/**
 * Component Loader Service
 * 
 * This service provides a robust architecture for loading FormIO components
 * from various sources while maintaining compatibility with CHEFS server validation.
 * 
 * Supports:
 * - Runtime imports (ES modules)
 * - External URIs (CDN, server-hosted components)
 * - Fallback to standard FormIO components
 * - Component validation and registration
 */

class ComponentLoader {
  constructor() {
    this.loadedComponents = new Map();
    this.loadingPromises = new Map();
    this.componentRegistry = new Map();
    this.fallbackComponents = new Map();
  }

  /**
   * Initialize the component loader with FormIO instance
   */
  initialize(FormioInstance) {
    this.Formio = FormioInstance;
    this.registerBuiltInComponents();
  }

  /**
   * Register built-in FormIO components as fallbacks
   */
  registerBuiltInComponents() {
    if (!this.Formio?.Components?.components) return;
    
    const builtInComponents = Object.keys(this.Formio.Components.components);
    console.log('Registering built-in FormIO components:', builtInComponents);
    
    builtInComponents.forEach(componentType => {
      this.fallbackComponents.set(componentType, {
        type: componentType,
        source: 'builtin',
        component: this.Formio.Components.components[componentType]
      });
    });
  }

  /**
   * Load components from external URIs (BC Government custom components)
   */
  async loadExternalComponents(externalUris = []) {
    if (!externalUris.length) {
      console.log('No external components to load');
      return { success: true, loadedComponents: [] };
    }

    console.log('Loading external components from URIs:', externalUris);
    const results = [];

    for (const uri of externalUris) {
      try {
        if (this.loadedComponents.has(uri)) {
          console.log(`Component from ${uri} already loaded`);
          results.push({ uri, status: 'cached', components: this.loadedComponents.get(uri) });
          continue;
        }

        // Prevent duplicate loading
        if (this.loadingPromises.has(uri)) {
          console.log(`Waiting for ${uri} to finish loading...`);
          await this.loadingPromises.get(uri);
          results.push({ uri, status: 'deduped', components: this.loadedComponents.get(uri) });
          continue;
        }

        const loadPromise = this.loadScriptFromUri(uri);
        this.loadingPromises.set(uri, loadPromise);

        const componentInfo = await loadPromise;
        this.loadedComponents.set(uri, componentInfo);
        this.loadingPromises.delete(uri);

        results.push({ uri, status: 'loaded', components: componentInfo });

      } catch (error) {
        console.error(`Failed to load component from ${uri}:`, error);
        this.loadingPromises.delete(uri);
        results.push({ uri, status: 'error', error: error.message });
      }
    }

    return { success: true, results };
  }

  /**
   * Load a script from external URI and detect registered components
   */
  async loadScriptFromUri(uri) {
    const beforeComponents = this.getRegisteredComponents();
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = uri;
      script.async = true;
      
      script.onload = () => {
        // Detect newly registered components
        const afterComponents = this.getRegisteredComponents();
        const newComponents = afterComponents.filter(comp => !beforeComponents.includes(comp));
        
        console.log(`Successfully loaded ${uri}, new components:`, newComponents);
        
        resolve({
          uri,
          newComponents,
          totalComponents: afterComponents.length
        });
      };
      
      script.onerror = () => {
        reject(new Error(`Failed to load script from ${uri}`));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Get currently registered FormIO components
   */
  getRegisteredComponents() {
    if (!this.Formio?.Components?.components) return [];
    return Object.keys(this.Formio.Components.components);
  }

  /**
   * Validate form schema against available components
   */
  validateFormSchema(schema) {
    const validationResults = {
      valid: true,
      missingComponents: [],
      availableComponents: this.getRegisteredComponents(),
      recommendations: []
    };

    if (!schema.components) return validationResults;

    const requiredComponents = this.extractComponentTypes(schema.components);
    const availableComponents = this.getRegisteredComponents();

    for (const componentType of requiredComponents) {
      if (!availableComponents.includes(componentType)) {
        validationResults.valid = false;
        validationResults.missingComponents.push(componentType);
        
        // Check if we have a fallback
        if (this.fallbackComponents.has(componentType)) {
          validationResults.recommendations.push({
            missing: componentType,
            fallback: componentType,
            action: 'use_builtin'
          });
        } else {
          validationResults.recommendations.push({
            missing: componentType,
            action: 'load_external_or_replace'
          });
        }
      }
    }

    return validationResults;
  }

  /**
   * Extract all component types from form schema recursively
   */
  extractComponentTypes(components, types = new Set()) {
    for (const component of components) {
      if (component.type) {
        types.add(component.type);
      }
      
      // Handle nested components (panels, columns, etc.)
      if (component.components) {
        this.extractComponentTypes(component.components, types);
      }
      
      // Handle conditional components
      if (component.conditional && component.conditional.json) {
        // Parse conditional logic for component types
      }
    }
    
    return Array.from(types);
  }

  /**
   * Prepare form for rendering by ensuring all components are available
   */
  async prepareFormForRendering(schema, externalUris = []) {
    console.log('Preparing form for rendering...');
    
    // Step 1: Load external components
    const loadResults = await this.loadExternalComponents(externalUris);
    
    // Step 2: Validate schema against available components
    const validation = this.validateFormSchema(schema);
    
    // Step 3: Apply recommendations if needed
    let finalSchema = schema;
    if (!validation.valid) {
      console.warn('Form schema validation issues:', validation.missingComponents);
      finalSchema = this.applyFallbacks(schema, validation.recommendations);
    }
    
    return {
      schema: finalSchema,
      validation,
      loadResults,
      readyForRendering: true
    };
  }

  /**
   * Apply fallback components for missing ones
   */
  applyFallbacks(schema, recommendations) {
    // For now, log the recommendations
    // In a full implementation, this would transform the schema
    console.log('Component fallback recommendations:', recommendations);
    return schema;
  }

  /**
   * Get component loading status
   */
  getStatus() {
    return {
      loadedSources: Array.from(this.loadedComponents.keys()),
      availableComponents: this.getRegisteredComponents(),
      fallbackComponents: Array.from(this.fallbackComponents.keys()),
      isReady: this.Formio !== null
    };
  }
}

// Create singleton instance
export const componentLoader = new ComponentLoader();

export default componentLoader;
