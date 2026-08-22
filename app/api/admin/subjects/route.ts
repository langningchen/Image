import { applySubjectAction, type SubjectAction } from "@/lib/admin-actions";
import { isAdmin } from "@/lib/auth";
import { cloudflareEnv } from "@/lib/cloudflare";
import { isDemoMode } from "@/lib/demo";
import {
  jsonError,
  jsonOk,
  requestHasSameOrigin,
  withApiErrorBoundary,
} from "@/lib/http";
import { resolveSubject } from "@/lib/subjects";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS: SubjectAction[] = [
  "warn",
  "ban_temporary",
  "ban_permanent",
  "unban",
  "reset_warnings",
];

async function post(request: Request) {
  if (!requestHasSameOrigin(request)) return jsonError("INVALID_ORIGIN", 403);
  const env = cloudflareEnv();
  const demoMode = isDemoMode(env);
  if (!(await isAdmin(request, env)) && !demoMode)
    return jsonError("UNAUTHORIZED", 401);
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("INVALID_JSON", 400);
  }
  const ip = typeof body.ip === "string" ? body.ip.trim() : "";
  const action = body.action as SubjectAction;
  if (!ip || ip.length > 64 || !ALLOWED_ACTIONS.includes(action))
    return jsonError("INVALID_ACTION", 400);
  if (demoMode)
    return jsonOk({
      simulated: true,
      subject: { ipMasked: ip, action },
    });
  const subject = await resolveSubject(env.DB, ip, env.IP_HASH_SECRET, true);
  if (!subject) return jsonError("SUBJECT_FAILED", 500);
  const updated = await applySubjectAction(env.DB, subject.id, {
    action,
    reason: typeof body.reason === "string" ? body.reason : undefined,
    durationHours:
      typeof body.durationHours === "number" ? body.durationHours : undefined,
  });
  return jsonOk({ subject: updated, simulated: false });
}

export function POST(request: Request) {
  return withApiErrorBoundary("Manual subject moderation failed", () =>
    post(request),
  );
}
