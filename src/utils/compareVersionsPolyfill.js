/**
 * Compare Versions Polyfill
 * 
 * This provides a compatible version of the compare-versions function
 * that FormIO expects, bypassing the ES module import issues.
 */

// LOADING CONFIRMATION
console.log('🚨 POLYFILL LOADING: compareVersionsPolyfill.js is executing!');

// Simple version comparison function compatible with FormIO's expectations
function compareVersions(a, b) {
  // DEBUG LOGGING
  console.log('🚨 POLYFILL CALLED: compareVersions called with:', { a, b, typeA: typeof a, typeB: typeof b });
  
  // Handle non-string inputs
  if (a == null && b == null) {
    return 0;
  }
  if (a == null) {
    return -1;
  }
  if (b == null) {
    return 1;
  }
  
  // Convert to strings if they aren't already
  const versionA = String(a);
  const versionB = String(b);
  
  // Handle empty strings
  if (!versionA && !versionB) return 0;
  if (!versionA) return -1;
  if (!versionB) return 1;
  
  const aParts = versionA.split('.').map(part => {
    const num = parseInt(part, 10);
    return isNaN(num) ? 0 : num;
  });
  const bParts = versionB.split('.').map(part => {
    const num = parseInt(part, 10);
    return isNaN(num) ? 0 : num;
  });
  const maxLength = Math.max(aParts.length, bParts.length);
  
  for (let i = 0; i < maxLength; i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;
    
    if (aPart > bPart) return 1;
    if (aPart < bPart) return -1;
  }
  
  return 0;
}

// Extend the function with additional methods that FormIO might use
compareVersions.compare = compareVersions;
compareVersions.validate = (version) => {
  if (version == null) return false;
  return /^\d+(\.\d+)*/.test(String(version));
};

// Additional methods that the original compare-versions library might have
compareVersions.compareVersions = compareVersions;

// Make it work when called directly or as a property
const wrapper = (...args) => compareVersions(...args);
Object.assign(wrapper, compareVersions);

// Export as both default and named export to cover all cases
export default wrapper;
export { compareVersions };
