import { describe, expect, it } from "vitest";
import { jsonError, withApiErrorBoundary } from "@/lib/http";

describe("API error contract", () => {
  it("returns only a stable code and structured interpolation parameters", async () => {
    const response = jsonError("FILE_TOO_LARGE", 413, { maxMiB: 10 });
    await expect(response.json()).resolves.toEqual({
      ok: false,
      error: {
        code: "FILE_TOO_LARGE",
        params: { maxMiB: 10 },
      },
    });
    expect(response.status).toBe(413);
  });

  it("does not serialize a translated message", async () => {
    const payload = (await jsonError("UNAUTHORIZED", 401).json()) as {
      error: Record<string, unknown>;
    };
    expect(payload.error).not.toHaveProperty("message");
  });

  it("keeps unexpected route failures inside the same error contract", async () => {
    const original = console.error;
    console.error = () => undefined;
    try {
      const response = await withApiErrorBoundary("test", () => {
        throw new Error("database unavailable");
      });
      await expect(response.json()).resolves.toEqual({
        ok: false,
        error: { code: "INTERNAL_ERROR" },
      });
    } finally {
      console.error = original;
    }
  });
});
