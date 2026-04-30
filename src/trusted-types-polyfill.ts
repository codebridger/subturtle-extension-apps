/**
 * Trusted Types Workaround
 *
 * Some hosts (e.g. MS Teams, certain enterprise web apps) ship a strict
 * Trusted Types CSP that only allows a fixed allow-list of policy names.
 * Vue 3 calls `trustedTypes.createPolicy("vue", ...)` during mount, which
 * the host CSP rejects, and the extension fails to render.
 *
 * This module monkey-patches `trustedTypes.createPolicy` so that:
 *   - Vue's policy attempts (name === "vue" or starts with "vue-") return a
 *     passthrough that mimics TrustedHTML / TrustedScript / TrustedScriptURL
 *     by returning the input unchanged.
 *   - Other policy names go through the original `createPolicy`, with the
 *     same passthrough as a fallback if the host still rejects them.
 *
 * NOT imported by default. Import it from a content-script entry point only
 * when the extension needs to run on a host that blocks Vue's policy.
 */

const trustedTypes = (window as any).trustedTypes;

if (trustedTypes && trustedTypes.createPolicy) {
  console.log("[Subturtle] Setting up Trusted Types workaround");

  const originalCreatePolicy = trustedTypes.createPolicy.bind(trustedTypes);

  const createPassthroughPolicy = () => ({
    createHTML: (input: string) => input,
    createScript: (input: string) => input,
    createScriptURL: (input: string) => input,
  });

  trustedTypes.createPolicy = function (name: string, rules: any) {
    if (name === "vue" || name.startsWith("vue-")) {
      console.log(
        `[Subturtle] Intercepted policy creation for "${name}", returning passthrough`
      );
      return createPassthroughPolicy();
    }

    try {
      return originalCreatePolicy(name, rules);
    } catch (error) {
      console.warn(`[Subturtle] Failed to create policy "${name}":`, error);
      return createPassthroughPolicy();
    }
  };

  console.log("[Subturtle] Trusted Types workaround installed");
}

export {};
