/**
 * Trusted Types Polyfill for MS Teams
 * 
 * MS Teams has a strict CSP that only allows specific policy names.
 * This polyfill intercepts Vue's policy creation and provides a passthrough.
 */

// Check if Trusted Types API is available
const trustedTypes = (window as any).trustedTypes;

if (trustedTypes && trustedTypes.createPolicy) {
  console.log('[Subturtle] Setting up Trusted Types workaround for MS Teams');
  
  // Store the original createPolicy function
  const originalCreatePolicy = trustedTypes.createPolicy.bind(trustedTypes);
  
  // Create a passthrough policy that just returns the input
  // We use a simple object that mimics TrustedHTML/TrustedScript behavior
  const createPassthroughPolicy = () => ({
    createHTML: (input: string) => input,
    createScript: (input: string) => input,
    createScriptURL: (input: string) => input,
  });
  
  // Monkey-patch createPolicy to intercept Vue's attempts
  trustedTypes.createPolicy = function(name: string, rules: any) {
    if (name === 'vue' || name.startsWith('vue-')) {
      console.log(`[Subturtle] Intercepted policy creation for "${name}", returning passthrough`);
      // Return a passthrough policy instead of creating a real one
      return createPassthroughPolicy();
    }
    
    // For other policies, use the original function
    try {
      return originalCreatePolicy(name, rules);
    } catch (error) {
      console.warn(`[Subturtle] Failed to create policy "${name}":`, error);
      // Return passthrough as fallback
      return createPassthroughPolicy();
    }
  };
  
  console.log('[Subturtle] Trusted Types workaround installed');
}

export {};
