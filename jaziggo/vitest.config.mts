import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [tsconfigPaths()],
        test: {
          name: "node",
          environment: "node",
          include: ["tests/**/*.{test,spec}.ts"],
          setupFiles: ["./tests/setup.ts"],
          clearMocks: true,
          restoreMocks: true,
          unstubEnvs: true,
          unstubGlobals: true,
        },
      },
      {
        plugins: [tsconfigPaths(), react()],
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["tests/**/*.{test,spec}.tsx"],
          setupFiles: ["./tests/setup.ts"],
          clearMocks: true,
          restoreMocks: true,
          unstubEnvs: true,
          unstubGlobals: true,
        },
      },
    ],
    passWithNoTests: true,
  },
});
