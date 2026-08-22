import { describe, expect, it } from "vitest";
import {
  databaseIdFromList,
  generateSecretBundle,
  updateD1DatabaseId,
} from "../scripts/deploy.mjs";

describe("guided deployment helpers", () => {
  it("generates three independent high-entropy secrets", () => {
    const secrets = generateSecretBundle();
    expect(Object.keys(secrets).sort()).toEqual([
      "CONFIG_ENCRYPTION_KEY",
      "IP_HASH_SECRET",
      "SESSION_SECRET",
    ]);
    expect(new Set(Object.values(secrets)).size).toBe(3);
    for (const secret of Object.values(secrets)) {
      expect(secret).toMatch(/^[A-Za-z0-9_-]{64}$/);
    }
  });

  it("finds D1 database IDs in Wrangler JSON output", () => {
    const output = JSON.stringify([
      { name: "other", uuid: "other-id" },
      { name: "image-metadata", uuid: "database-id" },
    ]);
    expect(databaseIdFromList(output, "image-metadata")).toBe("database-id");
  });

  it("updates only the selected D1 binding", () => {
    const config = `[[d1_databases]]
binding = "DB"
database_name = "image-metadata"
database_id = "placeholder"

[vars]
DEMO_MODE = "false"
`;
    const updated = updateD1DatabaseId(config, "image-metadata", "actual-id");
    expect(updated).toContain('database_id = "actual-id"');
    expect(updated).toContain('DEMO_MODE = "false"');
  });
});
