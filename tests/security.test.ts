import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/encryption";
import { createSession, subjectIdForIp, verifySession } from "@/lib/security";

describe("security primitives", () => {
  it("creates purpose-bound signed sessions", async () => {
    const token = await createSession("test-secret", "admin", 60);
    await expect(verifySession(token, "test-secret", "admin")).resolves.toBe(
      true,
    );
    await expect(verifySession(token, "test-secret", "access")).resolves.toBe(
      false,
    );
    await expect(
      verifySession(`${token.slice(0, -1)}x`, "test-secret", "admin"),
    ).resolves.toBe(false);
  });

  it("creates stable, secret-dependent subject identifiers", async () => {
    const first = await subjectIdForIp("203.0.113.42", "secret-a");
    const second = await subjectIdForIp("203.0.113.42", "secret-a");
    const different = await subjectIdForIp("203.0.113.42", "secret-b");
    expect(first).toBe(second);
    expect(first).not.toBe(different);
    expect(first).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("encrypts stored credentials with authenticated encryption", async () => {
    const encrypted = await encryptSecret("github_pat", "encryption-key");
    expect(encrypted).not.toContain("github_pat");
    await expect(decryptSecret(encrypted, "encryption-key")).resolves.toBe(
      "github_pat",
    );
    await expect(decryptSecret(encrypted, "wrong-key")).rejects.toBeInstanceOf(
      Error,
    );
  });
});
