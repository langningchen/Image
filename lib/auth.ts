import {
  accessPasswordHash,
  constantTimeEqual,
  createSession,
  hmacHex,
  readCookie,
  verifySession,
} from "@/lib/security";
import type { AppSettings } from "@/lib/types";

export const ADMIN_COOKIE = "vanishpic_admin";
export const ACCESS_COOKIE = "vanishpic_access";
export const ADMIN_SESSION_SECONDS = 12 * 60 * 60;
export const ACCESS_SESSION_SECONDS = 30 * 24 * 60 * 60;

export async function verifyAdminPassword(
  password: string,
  env: CloudflareEnv,
): Promise<boolean> {
  const [provided, expected] = await Promise.all([
    hmacHex(env.SESSION_SECRET, `admin-password:${password}`),
    hmacHex(env.SESSION_SECRET, `admin-password:${env.ADMIN_PASSWORD}`),
  ]);
  return constantTimeEqual(provided, expected);
}

export async function createAdminSession(env: CloudflareEnv): Promise<string> {
  return createSession(env.SESSION_SECRET, "admin", ADMIN_SESSION_SECONDS);
}

export async function isAdmin(
  request: Request,
  env: CloudflareEnv,
): Promise<boolean> {
  return verifySession(
    readCookie(request, ADMIN_COOKIE),
    env.SESSION_SECRET,
    "admin",
  );
}

function accessPurpose(settings: AppSettings): string {
  return `access-${settings.accessPasswordHash.slice(0, 16)}`;
}

export async function verifyAccessPassword(
  password: string,
  settings: AppSettings,
  env: CloudflareEnv,
): Promise<boolean> {
  if (!settings.accessPasswordHash) return false;
  const provided = await accessPasswordHash(password, env.SESSION_SECRET);
  return constantTimeEqual(provided, settings.accessPasswordHash);
}

export async function createAccessSession(
  settings: AppSettings,
  env: CloudflareEnv,
): Promise<string> {
  return createSession(
    env.SESSION_SECRET,
    accessPurpose(settings),
    ACCESS_SESSION_SECONDS,
  );
}

export async function hasUploadAccess(
  request: Request,
  settings: AppSettings,
  env: CloudflareEnv,
): Promise<boolean> {
  if (settings.accessMode === "public") return true;
  return verifySession(
    readCookie(request, ACCESS_COOKIE),
    env.SESSION_SECRET,
    accessPurpose(settings),
  );
}
