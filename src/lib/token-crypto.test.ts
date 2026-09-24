import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/token-crypto";

describe("token-crypto", () => {
  it("round-trips oauth token", () => {
    const plain = "ya29.test-token-value";
    const enc = encryptSecret(plain);
    expect(enc.startsWith("enc:v1:")).toBe(true);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("passes through legacy plaintext", () => {
    expect(decryptSecret("plain-token")).toBe("plain-token");
  });
});
