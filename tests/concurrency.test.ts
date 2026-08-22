import { describe, expect, it } from "vitest";
import { mapConcurrent } from "@/lib/concurrency";

describe("mapConcurrent", () => {
  it("preserves order and limits active operations", async () => {
    let active = 0;
    let peak = 0;
    const result = await mapConcurrent([1, 2, 3, 4], 2, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await Promise.resolve();
      active -= 1;
      return value * 2;
    });

    expect(peak).toBeLessThanOrEqual(2);
    expect(
      result.map((item) => (item.status === "fulfilled" ? item.value : null)),
    ).toEqual([2, 4, 6, 8]);
  });

  it("keeps processing after an item fails", async () => {
    const result = await mapConcurrent([1, 2, 3], 2, async (value) => {
      if (value === 2) throw new Error("failed");
      return value;
    });

    expect(result.map(({ status }) => status)).toEqual([
      "fulfilled",
      "rejected",
      "fulfilled",
    ]);
  });
});
