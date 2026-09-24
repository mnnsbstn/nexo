import { afterEach, describe, expect, it, vi } from "vitest";
import { isWebPushConfigured } from "@/server/push/vapid-config";

describe("vapid-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires all vapid env vars", () => {
    expect(isWebPushConfigured()).toBe(false);
    vi.stubEnv("NEXO_VAPID_PUBLIC_KEY", "pub");
    vi.stubEnv("NEXO_VAPID_PRIVATE_KEY", "priv");
    vi.stubEnv("NEXO_VAPID_SUBJECT", "mailto:nexo@example.com");
    expect(isWebPushConfigured()).toBe(true);
  });
});
