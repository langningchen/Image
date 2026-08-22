import { isAdmin } from "@/lib/auth";
import { cloudflareEnv } from "@/lib/cloudflare";
import { isDemoMode } from "@/lib/demo";
import { decryptSecret, encryptSecret } from "@/lib/encryption";
import {
  jsonError,
  jsonOk,
  requestHasSameOrigin,
  withApiErrorBoundary,
} from "@/lib/http";
import {
  getStorageConfig,
  StorageConfigurationError,
  verifyGithubStorage,
} from "@/lib/storage";
import type { StorageBackend } from "@/lib/types";

export const dynamic = "force-dynamic";

const OWNER_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/u;
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/u;
const BRANCH_PATTERN = /^[A-Za-z0-9._/-]{1,200}$/u;

async function get(request: Request) {
  const env = cloudflareEnv();
  if (!(await isAdmin(request, env)) && !isDemoMode(env))
    return jsonError("UNAUTHORIZED", 401);
  const config = await getStorageConfig(env);
  return jsonOk({
    setup: {
      setupCompleted: config.setupCompleted,
      backend: config.backend,
      githubOwner: config.githubOwner,
      githubRepo: config.githubRepo,
      githubBranch: config.githubBranch,
      githubPatConfigured: Boolean(config.githubPatEncrypted),
    },
    demoMode: isDemoMode(env),
  });
}

async function put(request: Request) {
  if (!requestHasSameOrigin(request)) return jsonError("INVALID_ORIGIN", 403);
  const env = cloudflareEnv();
  if (!(await isAdmin(request, env)) && !isDemoMode(env))
    return jsonError("UNAUTHORIZED", 401);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("INVALID_JSON", 400);
  }
  const backend: StorageBackend = body.backend === "github" ? "github" : "r2";
  const current = await getStorageConfig(env);
  let githubOwner = current.githubOwner;
  let githubRepo = current.githubRepo;
  let githubBranch = current.githubBranch;
  let encryptedPat = current.githubPatEncrypted;
  if (isDemoMode(env)) {
    return jsonOk({
      setup: {
        setupCompleted: true,
        backend,
        githubOwner:
          typeof body.githubOwner === "string" ? body.githubOwner.trim() : "",
        githubRepo:
          typeof body.githubRepo === "string" ? body.githubRepo.trim() : "",
        githubBranch:
          typeof body.githubBranch === "string"
            ? body.githubBranch.trim()
            : "main",
        githubPatConfigured:
          typeof body.githubPat === "string" && body.githubPat.length > 0,
      },
      simulated: true,
    });
  }

  if (backend === "r2") {
    try {
      await env.IMAGE_BUCKET.list({ limit: 1 });
    } catch {
      return jsonError("R2_UNAVAILABLE", 400);
    }
  } else {
    githubOwner =
      typeof body.githubOwner === "string" ? body.githubOwner.trim() : "";
    githubRepo =
      typeof body.githubRepo === "string" ? body.githubRepo.trim() : "";
    githubBranch =
      typeof body.githubBranch === "string" ? body.githubBranch.trim() : "main";
    const newPat =
      typeof body.githubPat === "string" ? body.githubPat.trim() : "";
    if (
      !OWNER_PATTERN.test(githubOwner) ||
      !REPO_PATTERN.test(githubRepo) ||
      !BRANCH_PATTERN.test(githubBranch)
    ) {
      return jsonError("INVALID_GITHUB_CONFIG", 400);
    }
    let token = newPat;
    if (!token && encryptedPat) {
      try {
        token = await decryptSecret(encryptedPat, env.CONFIG_ENCRYPTION_KEY);
      } catch {
        return jsonError("PAT_DECRYPT_FAILED", 400);
      }
    }
    if (!token) return jsonError("PAT_REQUIRED", 400);
    try {
      await verifyGithubStorage(githubOwner, githubRepo, githubBranch, token);
    } catch (error) {
      return error instanceof StorageConfigurationError
        ? jsonError(error.code, 400, error.params)
        : jsonError("GITHUB_VERIFY_FAILED", 400);
    }
    if (newPat) {
      encryptedPat = await encryptSecret(newPat, env.CONFIG_ENCRYPTION_KEY);
    }
  }

  const preview = {
    setupCompleted: true,
    backend,
    githubOwner,
    githubRepo,
    githubBranch,
    githubPatConfigured: Boolean(encryptedPat),
  };
  const now = Date.now();
  const values: Array<[string, string]> = [
    ["setup_completed", "true"],
    ["storage_backend", backend],
    ["github_owner", githubOwner],
    ["github_repo", githubRepo],
    ["github_branch", githubBranch],
    ["github_pat_encrypted", encryptedPat],
  ];
  await env.DB.batch(
    values.map(([key, value]) =>
      env.DB.prepare(
        `INSERT INTO settings (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value = excluded.value,
           updated_at = excluded.updated_at`,
      ).bind(key, value, now),
    ),
  );
  return jsonOk({ setup: preview, simulated: false });
}

export function GET(request: Request) {
  return withApiErrorBoundary("Storage setup read failed", () => get(request));
}

export function PUT(request: Request) {
  return withApiErrorBoundary("Storage setup update failed", () =>
    put(request),
  );
}
