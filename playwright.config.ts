import { defineConfig, devices } from "@playwright/test";

const PORT = 3010;
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command:
      "rm -f prisma/e2e.db prisma/e2e.db-journal && npm run db:push && npm run build && npm run start -- -p 3010",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      NODE_ENV: "production",
      PORT: String(PORT),
      DATABASE_URL: "file:./e2e.db",
      NEXO_DEMO_MODE: "true",
      NEXO_AUTH_PASSWORD: "",
      NEXO_SESSION_SECRET: "",
      OPENAI_API_KEY: "",
      NEXO_E2E_CALENDAR_MOCK: "1",
      NEXO_PUBLIC_URL: baseURL,
      GOOGLE_CLIENT_ID: "e2e-not-a-real-client",
      GOOGLE_CLIENT_SECRET: "e2e-not-a-real-secret",
    },
  },
});
