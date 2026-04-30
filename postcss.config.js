const tailwindcss = require("tailwindcss");
const prefixSelector = require("postcss-prefix-selector");

const SCOPE = ".subturtle-scope";

module.exports = {
  plugins: [
    "postcss-preset-env",
    tailwindcss,
    prefixSelector({
      prefix: SCOPE,
      transform(prefix, selector, prefixedSelector) {
        const trimmed = selector.trim();

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

        if (/^(html|:root)$/.test(trimmed)) {
          return prefix;
        }

        // Tailwind class-based dark mode emits selectors like `.dark .foo`.
        // Merge `.dark` with the prefix as a compound selector so a single
        // `.subturtle-scope.dark` element activates dark utilities for all
        // its descendants — without requiring a separate `.dark` ancestor
        // inside the scope.
        if (/^\.dark(?=[\s.:>+~\[]|$)/.test(trimmed)) {
          return prefix + trimmed;
        }

        return prefixedSelector;
      },
    }),
  ],
};
