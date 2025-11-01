import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for AI Notes POC
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',

  // Maximum time one test can run
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: false, // Run tests serially to avoid database conflicts
  forbidOnly: !!process.env.CI, // Fail CI if test.only is left in
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Single worker to avoid race conditions

  // Reporter configuration
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  // Shared settings for all tests
  use: {
    // Base URL for the application
    baseURL: 'http://localhost:5173',

    // Collect trace when retrying failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Browser context options
    viewport: { width: 1280, height: 720 },

    // Navigation timeout
    navigationTimeout: 30 * 1000,

    // Action timeout
    actionTimeout: 10 * 1000,
  },

  // Configure projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test in other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Run local dev server before starting tests
  // This is optional - we expect docker-compose to be running
  webServer: process.env.SKIP_WEB_SERVER ? undefined : {
    command: 'echo "Using external docker-compose services"',
    url: 'http://localhost:5173',
    timeout: 120 * 1000,
    reuseExistingServer: true,
  },
});
