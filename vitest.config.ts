import { defineConfig } from "vitest/config";

export default defineConfig({
  // The project's postcss.config.js targets webpack and uses a custom
  // rem→px plugin that Vite's loader rejects. Tests don't import CSS, so
  // an inline empty postcss config bypasses the file.
  css: {
    postcss: {
      plugins: [],
    },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    globals: false,
  },
});
