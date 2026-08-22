import { isAdmin } from "@/lib/auth";
import { cloudflareEnv } from "@/lib/cloudflare";
import { isDemoMode } from "@/lib/demo";
import { jsonOk, withApiErrorBoundary } from "@/lib/http";
import { getStorageConfig } from "@/lib/storage";

export const dynamic = "force-dynamic";

async function get(request: Request) {
  const env = cloudflareEnv();
  const demoMode = isDemoMode(env);
  const authenticated = demoMode || (await isAdmin(request, env));
  const storage = authenticated ? await getStorageConfig(env) : null;
  return jsonOk({
    authenticated,
    demoMode,
    setupCompleted: storage?.setupCompleted ?? false,
  });
}

export function GET(request: Request) {
  return withApiErrorBoundary("Admin session check failed", () => get(request));
}
