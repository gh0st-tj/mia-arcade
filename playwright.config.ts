import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/mobile',
  timeout: 90000,
  expect: { timeout: 7000 },
  workers: 2,
  reporter: 'list',
  use: {
    baseURL: process.env.ARCADE_TEST_URL || 'http://127.0.0.1:4173',
    reducedMotion: 'reduce',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
    },
    {
      name: 'mobile-webkit',
      use: { ...devices['iPhone 13'], browserName: 'webkit' },
    },
  ],
  webServer: process.env.ARCADE_TEST_URL
    ? undefined
    : {
        command:
          'python3 -m http.server 4173 --bind 127.0.0.1 --directory dist/client',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: true,
      },
});
