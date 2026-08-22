import {
  ACCESS_COOKIE,
  ACCESS_SESSION_SECONDS,
  createAccessSession,
  verifyAccessPassword,
} from "@/lib/auth";
import { cloudflareEnv } from "@/lib/cloudflare";
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
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

async function post(request: Request) {
  if (!requestHasSameOrigin(request)) return jsonError("INVALID_ORIGIN", 403);
  const env = cloudflareEnv();
  const subjectId = await subjectIdForIp(
    getClientIp(request),
    env.IP_HASH_SECRET,
  );
  const throttle = await getLoginThrottle(env.DB, subjectId, "access");
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
  if (password.length > 256) return jsonError("INVALID_PASSWORD_FORMAT", 400);

  const settings = await getSettings(env.DB);
  if (
    settings.accessMode !== "password" ||
    !(await verifyAccessPassword(password, settings, env))
  ) {
    await recordLoginFailure(env.DB, subjectId, "access");
    return jsonError("INVALID_PASSWORD", 401);
  }
  await clearLoginFailures(env.DB, subjectId, "access");
  const session = await createAccessSession(settings, env);
  const response = jsonOk({ authenticated: true });
  response.headers.set(
    "Set-Cookie",
    sessionCookie(ACCESS_COOKIE, session, ACCESS_SESSION_SECONDS),
  );
  return response;
}

async function removeAccess() {
  const response = jsonOk({ authenticated: false });
  response.headers.set("Set-Cookie", clearCookie(ACCESS_COOKIE));
  return response;
}

export function POST(request: Request) {
  return withApiErrorBoundary("Access login failed", () => post(request));
}

export function DELETE() {
  return withApiErrorBoundary("Access logout failed", removeAccess);
}
