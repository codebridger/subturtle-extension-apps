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

        if (trimmed === prefix || trimmed.startsWith(prefix + " ")) {
          return selector;
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

        return prefixedSelector;
      },
    }),
  ],
};
