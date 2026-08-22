import { describe, expect, it } from "vitest";
import {
  detectImageMime,
  ImageValidationError,
  validateImage,
} from "@/lib/image-validation";

describe("image validation", () => {
  it("detects supported formats from bytes rather than trusting the MIME header", () => {
    expect(
      detectImageMime(
        new Uint8Array([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0,
        ]),
      ),
    ).toBe("image/png");
    expect(
      detectImageMime(
        new Uint8Array([
          0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
        ]),
      ),
    ).toBe("image/webp");
  });

  it("normalizes misleading browser MIME metadata from detected bytes", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const file = new File([bytes], "spoof.png", { type: "image/png" });
    expect(validateImage(file, bytes, 1024)).toEqual({
      contentType: "image/jpeg",
      extension: "jpg",
      safeName: "spoof.jpg",
    });
  });

  it("returns structured size parameters for translation", () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const file = new File([bytes], "large.jpg", { type: "image/jpeg" });
    try {
      validateImage(file, bytes, 4);
      throw new Error("Expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ImageValidationError);
      expect(error).toMatchObject({
        code: "FILE_TOO_LARGE",
        status: 413,
        params: { maxMiB: 0 },
      });
    }
  });
});
