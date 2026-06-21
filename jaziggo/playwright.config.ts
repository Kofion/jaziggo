import { defineConfig, devices } from "@playwright/test";

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;
const testDatabaseURL =
  process.env.TEST_DATABASE_URL ??
  "postgresql://jaziggo_test:jaziggo_test@127.0.0.1:5432/jaziggo_test?schema=public";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: testDatabaseURL,
      AUTH_SECRET: "jaziggo-playwright-test-secret",
    },
  },
});
