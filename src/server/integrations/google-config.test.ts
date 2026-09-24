import { describe, expect, it, afterEach } from "vitest";
import {
  getPublicBaseUrl,
  isGoogleCalendarOAuthConfigured,
} from "@/server/integrations/google-config";

describe("google-config", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
  });

  it("isGoogleCalendarOAuthConfigured requires client env and public url", () => {
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "secret";
    delete process.env.NEXO_PUBLIC_URL;
    delete process.env.VERCEL_URL;
    expect(isGoogleCalendarOAuthConfigured()).toBe(false);
    process.env.NEXO_PUBLIC_URL = "http://localhost:3000";
    expect(isGoogleCalendarOAuthConfigured()).toBe(true);
  });

  it("getPublicBaseUrl prefers NEXO_PUBLIC_URL", () => {
    process.env.NEXO_PUBLIC_URL = "https://nexo.example.com/";
    expect(getPublicBaseUrl()).toBe("https://nexo.example.com");
  });
});
