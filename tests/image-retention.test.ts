import { describe, expect, it } from "vitest";
import {
  HOME_PREVIEW_QUERY_KEY,
  IMAGE_INACTIVITY_RETENTION_DAYS,
  IMAGE_INACTIVITY_RETENTION_MS,
  isHomePreviewRequest,
} from "@/lib/image-retention";

describe("image retention", () => {
  it("uses a fixed seven-day production inactivity period", () => {
    expect(IMAGE_INACTIVITY_RETENTION_DAYS).toBe(7);
    expect(IMAGE_INACTIVITY_RETENTION_MS).toBe(7 * 86_400_000);
  });

  it("identifies only the homepage preview query as non-access", () => {
    expect(
      isHomePreviewRequest(
        new Request(`https://example.test/image?${HOME_PREVIEW_QUERY_KEY}=1`),
      ),
    ).toBe(true);
    expect(
      isHomePreviewRequest(
        new Request(`https://example.test/image?${HOME_PREVIEW_QUERY_KEY}=0`),
      ),
    ).toBe(false);
    expect(
      isHomePreviewRequest(new Request("https://example.test/image")),
    ).toBe(false);
  });
});
