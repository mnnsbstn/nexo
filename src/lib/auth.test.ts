import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createSessionToken,
  verifySessionToken,
  verifyAppPassword,
  isAuthEnabled,
} from "@/lib/auth";

describe("auth", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("disabled when no password", async () => {
    delete process.env.NEXO_AUTH_PASSWORD;
    expect(isAuthEnabled()).toBe(false);
    expect(await verifySessionToken("invalid")).toBe(true);
  });

  it("session roundtrip when auth enabled", async () => {
    process.env.NEXO_AUTH_PASSWORD = "test-secret-password";
    process.env.NEXO_SESSION_SECRET = "unit-test-session-secret-32chars";
    expect(isAuthEnabled()).toBe(true);
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
    expect(await verifyAppPassword("test-secret-password")).toBe(true);
    expect(await verifyAppPassword("wrong")).toBe(false);
  });
});
