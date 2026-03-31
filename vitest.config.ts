import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/**/*.test.ts", "apps/**/*.test.ts", "apps/**/*.e2e.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/.nuxt/**"],
    passWithNoTests: false,
  },
});
