import { fileURLToPath, URL } from "url";

import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    coverage: {
      all: true,
      reporter: ["cobertura", "lcov"],
      reportsDirectory: "../../coverage/vitest",
      include: ["src"],
      exclude: ["src/components/icons"],
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
