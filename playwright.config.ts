import { defineConfig, devices } from "@playwright/test";

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./tests/e2e",
  /* Maximum time one test can run for */
  timeout: 30 * 1000,
  expect: {
    /**
     * Maximum time expect() should wait for the condition to be met
     */
    timeout: 5000,
  },
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Reporter to use */
  reporter: "html",
  /* Configure projects for major browsers */
  use: {
    baseURL: "http://localhost:5000", // match your app’s actual port (here: 5000)
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  /* Configure webServer */
  webServer: {
    command: "NODE_ENV=production npm run start",
    url: "http://localhost:5000",
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
  /* Directory for test artifacts like screenshots */
  outputDir: "test-artifacts/",
});