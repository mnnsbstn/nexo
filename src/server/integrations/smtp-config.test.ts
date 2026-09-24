import { afterEach, describe, expect, it, vi } from "vitest";
import { isSmtpSendConfigured } from "@/server/integrations/smtp-config";

describe("smtp-config", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires host and from", () => {
    vi.stubEnv("SMTP_HOST", "");
    vi.stubEnv("SMTP_FROM", "");
    expect(isSmtpSendConfigured()).toBe(false);
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_FROM", "nexo@example.com");
    expect(isSmtpSendConfigured()).toBe(true);
  });
});
