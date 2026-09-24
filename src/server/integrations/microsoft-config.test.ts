import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isMicrosoftCalendarOAuthConfigured,
  getMicrosoftTenantId,
} from "@/server/integrations/microsoft-config";

describe("microsoft-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults tenant to common", () => {
    vi.stubEnv("MICROSOFT_TENANT_ID", "");
    expect(getMicrosoftTenantId()).toBe("common");
  });

  it("isMicrosoftCalendarOAuthConfigured requires client env and public url", () => {
    vi.stubEnv("MICROSOFT_CLIENT_ID", "");
    vi.stubEnv("MICROSOFT_CLIENT_SECRET", "");
    vi.stubEnv("NEXO_PUBLIC_URL", "");
    expect(isMicrosoftCalendarOAuthConfigured()).toBe(false);
    vi.stubEnv("MICROSOFT_CLIENT_ID", "id");
    vi.stubEnv("MICROSOFT_CLIENT_SECRET", "secret");
    vi.stubEnv("NEXO_PUBLIC_URL", "http://localhost:3000");
    expect(isMicrosoftCalendarOAuthConfigured()).toBe(true);
  });
});
