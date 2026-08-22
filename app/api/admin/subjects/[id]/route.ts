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

export const dynamic = "force-dynamic";

const ID_PATTERN = /^[a-f0-9]{64}$/u;
const ALLOWED_ACTIONS: SubjectAction[] = [
  "warn",
  "ban_temporary",
  "ban_permanent",
  "unban",
  "reset_warnings",
];

async function post(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!requestHasSameOrigin(request)) return jsonError("INVALID_ORIGIN", 403);
  const { id } = await context.params;
  if (!ID_PATTERN.test(id)) return jsonError("INVALID_SUBJECT", 400);
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
  const action = body.action as SubjectAction;
  if (!ALLOWED_ACTIONS.includes(action))
    return jsonError("INVALID_ACTION", 400);
  if (demoMode) {
    return jsonOk({
      simulated: true,
      subject: { id, action },
    });
  }
  const subject = await applySubjectAction(env.DB, id, {
    action,
    reason: typeof body.reason === "string" ? body.reason : undefined,
    durationHours:
      typeof body.durationHours === "number" ? body.durationHours : undefined,
  });
  if (!subject) return jsonError("SUBJECT_NOT_FOUND", 404);
  return jsonOk({ subject, simulated: false });
}

export function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiErrorBoundary("Subject moderation request failed", () =>
    post(request, context),
  );
}
