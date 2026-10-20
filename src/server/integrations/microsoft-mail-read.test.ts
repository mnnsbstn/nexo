import { afterEach, describe, expect, it, vi } from "vitest";
import { listMicrosoftInboxMessages } from "@/server/integrations/microsoft-mail-read";

describe("listMicrosoftInboxMessages", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns E2E mock when calendar mock env set", async () => {
    vi.stubEnv("NEXO_E2E_CALENDAR_MOCK", "1");
    const result = await listMicrosoftInboxMessages("token", 5);
    expect(result.messages[0]?.provider).toBe("microsoft");
    expect(result.messages[0]?.subject).toContain("Mock");
  });

  it("parses Graph inbox response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          value: [
            {
              id: "msg-1",
              subject: "Weekly sync",
              from: { emailAddress: { name: "Alex", address: "alex@contoso.com" } },
              receivedDateTime: "2026-09-24T09:00:00Z",
              bodyPreview: "Hello team",
            },
          ],
        }),
      }),
    );
    const result = await listMicrosoftInboxMessages("access-token", 5);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.subject).toBe("Weekly sync");
    expect(result.messages[0]?.from).toContain("alex@contoso.com");
  });
});
