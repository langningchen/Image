import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function paths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    paths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("translation catalogs", () => {
  it("ships a valid English catalog only", () => {
    const catalogs = readdirSync("messages").filter((name) =>
      name.endsWith(".json"),
    );
    const english = JSON.parse(
      readFileSync("messages/en.json", "utf8"),
    ) as unknown;
    expect(catalogs).toEqual(["en.json"]);
    expect(paths(english)).toContain("Errors.UNKNOWN");
    expect(paths(english)).not.toContain("");
  });
});
