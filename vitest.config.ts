import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    exclude: ["tests/e2e/**", "node_modules/**", ".next/**", "디스코드 봇/**"],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 30000,
  },
});
