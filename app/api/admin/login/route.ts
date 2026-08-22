import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  createAdminSession,
  verifyAdminPassword,
} from "@/lib/auth";
import { cloudflareEnv } from "@/lib/cloudflare";
import { isDemoMode } from "@/lib/demo";
import {
  getClientIp,
  jsonError,
  jsonOk,
  requestHasSameOrigin,
  withApiErrorBoundary,
} from "@/lib/http";
import {
  clearLoginFailures,
  getLoginThrottle,
  recordLoginFailure,
} from "@/lib/login-throttle";
import { clearCookie, sessionCookie, subjectIdForIp } from "@/lib/security";

export const dynamic = "force-dynamic";

async function post(request: Request) {
  if (!requestHasSameOrigin(request)) return jsonError("INVALID_ORIGIN", 403);
  const env = cloudflareEnv();
  if (isDemoMode(env)) return jsonOk({ authenticated: true, demoMode: true });

  const subjectId = await subjectIdForIp(
    getClientIp(request),
    env.IP_HASH_SECRET,
  );
  const throttle = await getLoginThrottle(env.DB, subjectId, "admin");
  if (throttle.blocked) {
    const response = jsonError("TOO_MANY_ATTEMPTS", 429, {
      retryAfterSeconds: throttle.retryAfterSeconds,
    });
    response.headers.set("Retry-After", String(throttle.retryAfterSeconds));
    return response;
  }

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return jsonError("INVALID_JSON", 400);
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (!password || password.length > 512) {
    await recordLoginFailure(env.DB, subjectId, "admin");
    return jsonError("INVALID_PASSWORD", 401);
  }
  if (!(await verifyAdminPassword(password, env))) {
    await recordLoginFailure(env.DB, subjectId, "admin");
    return jsonError("INVALID_PASSWORD", 401);
  }

  await clearLoginFailures(env.DB, subjectId, "admin");
  const session = await createAdminSession(env);
  const response = jsonOk({ authenticated: true, demoMode: false });
  response.headers.set(
    "Set-Cookie",
    sessionCookie(ADMIN_COOKIE, session, ADMIN_SESSION_SECONDS),
  );
  return response;
}

async function removeSession() {
  const response = jsonOk({ authenticated: false });
  response.headers.set("Set-Cookie", clearCookie(ADMIN_COOKIE));
  return response;
}

export function POST(request: Request) {
  return withApiErrorBoundary("Admin login failed", () => post(request));
}

export function DELETE() {
  return withApiErrorBoundary("Admin logout failed", removeSession);
}
