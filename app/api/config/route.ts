import { hasUploadAccess } from "@/lib/auth";
import { cloudflareEnv } from "@/lib/cloudflare";
import { DEMO_EXPIRY_MINUTES, isDemoMode } from "@/lib/demo";
import { getClientIp, jsonError, jsonOk } from "@/lib/http";
import { getSettings, settingsForClient } from "@/lib/settings";
import { getStorageConfig } from "@/lib/storage";
import {
  normalizeExpiredBan,
  resolveSubject,
  subjectIsBanned,
  subjectNotice,
} from "@/lib/subjects";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const env = cloudflareEnv();
    const [settings, storage] = await Promise.all([
      getSettings(env.DB),
      getStorageConfig(env),
    ]);
    const subject = await resolveSubject(
      env.DB,
      getClientIp(request),
      env.IP_HASH_SECRET,
    );
    const normalized = subject
      ? await normalizeExpiredBan(env.DB, subject)
      : null;
    return jsonOk({
      config: {
        ...settingsForClient(settings),
        ...(isDemoMode(env) ? { accessMode: "public" as const } : {}),
        demoMode: isDemoMode(env),
        demoExpiryMinutes: DEMO_EXPIRY_MINUTES,
        setupCompleted: storage.setupCompleted,
        maxUploadMiB: Number.parseInt(env.MAX_UPLOAD_MIB || "10", 10),
      },
      viewer: {
        hasAccess:
          isDemoMode(env) || (await hasUploadAccess(request, settings, env)),
        warningCount: normalized?.warning_count ?? 0,
        notice: subjectNotice(normalized),
        banned: normalized ? subjectIsBanned(normalized) : false,
        permanentBan: normalized?.permanent_ban === 1,
        bannedUntil: normalized?.banned_until ?? null,
        banReason: normalized?.ban_reason_code
          ? {
              code: normalized.ban_reason_code,
              ...(normalized.ban_reason_detail
                ? { detail: normalized.ban_reason_detail }
                : {}),
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Public config failed", error);
    return jsonError("CONFIG_UNAVAILABLE", 503);
  }
}
