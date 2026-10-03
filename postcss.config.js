const tailwindcss = require("tailwindcss");
const prefixSelector = require("postcss-prefix-selector");

// Confines all extension CSS (Tailwind preflight + utilities, lib-vue-components
// styles, SFC blocks) to descendants of `.subturtle-scope`. Without this, the
// universal selectors in Tailwind preflight (`*, ::before, ::after`, `button`,
// `img`, ...) bleed onto the host page and break YouTube's icon rendering and
// video grid layout.
const SCOPE = ".subturtle-scope";

// Our theme class is `subturtle-dark`, never the bare `dark`. The element that
// carries it is injected into the HOST page's DOM, and host stylesheets key
// their own dark mode off `.dark` too — Product Hunt ships
// `:is(.dark, :has(.dark:not(.theme-isolate))) .theme-mirror { … }`, so a
// `.dark` anywhere in the document (our mount root) flipped the whole site to
// its dark palette. Every `.dark` class in OUR CSS — Tailwind's `dark:`
// variants and pilotui's prebuilt `:is(.dark *)` rules alike — is renamed here
// so it only ever matches the namespaced class settings.ts applies.
// `(?![\w\\-])` leaves utility names such as `.dark\:bg-gray-800` untouched.
const DARK_CLASS = ".subturtle-dark";
const renameDarkClass = (selector) =>
  selector.replace(/\.dark(?![\w\\-])/g, DARK_CLASS);

// Tailwind emits sizes in `rem`, but `rem` is always relative to the host
// page's <html> font-size — which themes (e.g. WordPress) routinely set to
// 18-24px. The result: every label in ConsoleCrane scales with the page.
// We freeze the extension UI to a fixed base by rewriting `rem` to `px` in
// the final CSS, both in declarations and at-rule params. Using 14 here
// because the ConsoleCrane was visually tuned against the smaller effective
// sizes that previously came through host-page inheritance — 16 (Tailwind
// default) renders too large in this context.
const REM_BASE_PX = 14;
function remToPxPlugin() {
  const remRegex = /(-?\d*\.?\d+)rem\b/g;
  const rewrite = (s) =>
    s.replace(remRegex, (_, n) => `${parseFloat(n) * REM_BASE_PX}px`);
  return {
    postcssPlugin: "subturtle-rem-to-px",
    Declaration(decl) {
      if (decl.value.includes("rem")) decl.value = rewrite(decl.value);
    },
    AtRule(rule) {
      if (rule.params.includes("rem")) rule.params = rewrite(rule.params);
    },
  };
}
remToPxPlugin.postcss = true;

module.exports = {
  plugins: [
    "postcss-preset-env",
    tailwindcss,
    prefixSelector({
      prefix: SCOPE,
      transform(prefix, rawSelector, rawPrefixedSelector) {
        const selector = renameDarkClass(rawSelector);
        const prefixedSelector = renameDarkClass(rawPrefixedSelector);
        const trimmed = selector.trim();

        // Idempotent guard: lib-vue-components CSS gets visited more than once
        // by the loader chain, which would otherwise produce double/triple
        // prefixes (`.subturtle-scope .subturtle-scope ...`) that never match.
        if (trimmed.startsWith(prefix)) {
          const charAfter = trimmed[prefix.length];
          if (charAfter === undefined || /[\s.:>+~\[]/.test(charAfter)) {
            return selector;
          }
        }

        // Drop `body` rules — they target the host page (background,
        // font-family, margin reset). Mapping them onto our wrapper paints
        // a visible frame around the host UI.
        if (trimmed === "body") {
          return ":not(*)";
        }

        // Map root-level selectors onto the scope so CSS custom properties
        // and typography defaults still cascade into the extension UI.
        if (/^(html|:root)$/.test(trimmed)) {
          return prefix;
        }

        // Tailwind class-based dark mode emits selectors like `.dark .foo`
        // (renamed to `.subturtle-dark .foo` above). Merge it with the prefix
        // as a compound selector so a single `.subturtle-scope.subturtle-dark`
        // element activates dark utilities for all its descendants — without
        // requiring a separate dark ancestor inside the scope.
        if (/^\.subturtle-dark(?=[\s.:>+~\[]|$)/.test(trimmed)) {
          return prefix + trimmed;
        }

        return prefixedSelector;
      },
    }),
    remToPxPlugin(),
  ],
};
