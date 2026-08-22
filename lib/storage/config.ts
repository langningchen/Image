import { isDemoMode } from "@/lib/demo";
import type { StorageConfig } from "@/lib/types";

async function settingsMap(db: D1Database): Promise<Record<string, string>> {
  const { results } = await db
    .prepare(
      `SELECT key, value FROM settings
       WHERE key IN (
         'setup_completed', 'storage_backend', 'github_owner', 'github_repo',
         'github_branch', 'github_pat_encrypted'
       )`,
    )
    .all<{ key: string; value: string }>();
  return Object.fromEntries(results.map(({ key, value }) => [key, value]));
}

export async function getStorageConfig(
  env: CloudflareEnv,
): Promise<StorageConfig> {
  if (isDemoMode(env)) {
    return {
      setupCompleted: true,
      backend: "r2",
      githubOwner: "",
      githubRepo: "",
      githubBranch: "main",
      githubPatEncrypted: "",
    };
  }

  const values = await settingsMap(env.DB);
  return {
    setupCompleted: values.setup_completed === "true",
    backend: values.storage_backend === "github" ? "github" : "r2",
    githubOwner: values.github_owner ?? "",
    githubRepo: values.github_repo ?? "",
    githubBranch: values.github_branch || "main",
    githubPatEncrypted: values.github_pat_encrypted ?? "",
  };
}
