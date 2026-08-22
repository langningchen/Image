import { settingsForAdmin } from "@/lib/admin-settings";
import { isAdmin } from "@/lib/auth";
import { cloudflareEnv } from "@/lib/cloudflare";
import { isDemoMode } from "@/lib/demo";
import {
  jsonError,
  jsonOk,
  requestHasSameOrigin,
  truncate,
  withApiErrorBoundary,
} from "@/lib/http";
import { IMAGE_INACTIVITY_RETENTION_DAYS } from "@/lib/image-retention";
import { accessPasswordHash } from "@/lib/security";
import { getSettings } from "@/lib/settings";
import type { AccessMode, AiFailMode, ViolationAction } from "@/lib/types";

export const dynamic = "force-dynamic";

async function get(request: Request) {
  const env = cloudflareEnv();
  if (!(await isAdmin(request, env)) && !isDemoMode(env))
    return jsonError("UNAUTHORIZED", 401);
  return jsonOk({
    settings: settingsForAdmin(await getSettings(env.DB)),
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
  const current = await getSettings(env.DB);
  const integer = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(body[key]);
    return Number.isInteger(value)
      ? Math.min(max, Math.max(min, value))
      : fallback;
  };
  const accessMode: AccessMode =
    body.accessMode === "password" ? "password" : "public";
  let passwordHash = current.accessPasswordHash;
  if (body.clearAccessPassword === true) passwordHash = "";
  if (typeof body.accessPassword === "string" && body.accessPassword) {
    if (body.accessPassword.length < 8 || body.accessPassword.length > 256)
      return jsonError("INVALID_ACCESS_PASSWORD", 400, { min: 8, max: 256 });
    passwordHash = await accessPasswordHash(
      body.accessPassword,
      env.SESSION_SECRET,
    );
  }
  if (accessMode === "password" && !passwordHash)
    return jsonError("ACCESS_PASSWORD_REQUIRED", 400);

  const aiModel =
    typeof body.aiModel === "string" ? body.aiModel.trim() : current.aiModel;
  if (!aiModel.startsWith("@cf/") || aiModel.length > 200)
    return jsonError("INVALID_AI_MODEL", 400);

  const values: Array<[string, string]> = [
    [
      "site_name",
      truncate(
        typeof body.siteName === "string" ? body.siteName : current.siteName,
        60,
      ).trim() || current.siteName,
    ],
    [
      "upload_title",
      truncate(
        typeof body.uploadTitle === "string"
          ? body.uploadTitle
          : current.uploadTitle,
        120,
      ).trim() || current.uploadTitle,
    ],
    [
      "upload_description",
      truncate(
        typeof body.uploadDescription === "string"
          ? body.uploadDescription
          : current.uploadDescription,
        300,
      ),
    ],
    [
      "site_footer",
      truncate(
        typeof body.siteFooter === "string"
          ? body.siteFooter
          : current.siteFooter,
        500,
      ),
    ],
    [
      "show_recent_uploads",
      body.showRecentUploads === false ? "false" : "true",
    ],
    [
      "paste_upload_enabled",
      body.pasteUploadEnabled === false ? "false" : "true",
    ],
    [
      "max_batch_size",
      String(integer("maxBatchSize", current.maxBatchSize, 1, 50)),
    ],
    [
      "upload_concurrency",
      String(integer("uploadConcurrency", current.uploadConcurrency, 1, 6)),
    ],
    [
      "history_limit",
      String(integer("historyLimit", current.historyLimit, 1, 100)),
    ],
    [
      "allow_uploader_delete",
      body.allowUploaderDelete === false ? "false" : "true",
    ],
    ["show_expiry_time", body.showExpiryTime === false ? "false" : "true"],
    ["show_view_count", body.showViewCount === false ? "false" : "true"],
    ["access_mode", accessMode],
    ["access_password_hash", passwordHash],
    ["retention_days", String(IMAGE_INACTIVITY_RETENTION_DAYS)],
    [
      "warning_ban_threshold",
      String(
        integer("warningBanThreshold", current.warningBanThreshold, 0, 100),
      ),
    ],
    [
      "auto_ban_hours",
      String(integer("autoBanHours", current.autoBanHours, 0, 8_760)),
    ],
    [
      "upload_limit_per_hour",
      String(
        integer("uploadLimitPerHour", current.uploadLimitPerHour, 1, 1_000),
      ),
    ],
    [
      "violation_action",
      (body.violationAction === "delete"
        ? "delete"
        : "delete_warn") satisfies ViolationAction,
    ],
    [
      "ai_moderation_enabled",
      body.aiModerationEnabled === true ? "true" : "false",
    ],
    [
      "ai_fail_mode",
      (body.aiFailMode === "block" ? "block" : "allow") satisfies AiFailMode,
    ],
    ["ai_model", aiModel],
    [
      "ai_policy",
      truncate(
        typeof body.aiPolicy === "string" ? body.aiPolicy : current.aiPolicy,
        2_000,
      ),
    ],
    [
      "site_notice",
      truncate(
        typeof body.siteNotice === "string"
          ? body.siteNotice
          : current.siteNotice,
        1_000,
      ),
    ],
    [
      "audit_log_days",
      String(integer("auditLogDays", current.auditLogDays, 7, 365)),
    ],
  ];
  const stored = Object.fromEntries(values);

  const preview = {
    ...current,
    siteName: stored.site_name,
    uploadTitle: stored.upload_title,
    uploadDescription: stored.upload_description,
    siteFooter: stored.site_footer,
    showRecentUploads: body.showRecentUploads !== false,
    pasteUploadEnabled: body.pasteUploadEnabled !== false,
    maxBatchSize: Number(stored.max_batch_size),
    uploadConcurrency: Number(stored.upload_concurrency),
    historyLimit: Number(stored.history_limit),
    allowUploaderDelete: body.allowUploaderDelete !== false,
    showExpiryTime: body.showExpiryTime !== false,
    showViewCount: body.showViewCount !== false,
    accessMode,
    accessPasswordHash: passwordHash,
    retentionDays: Number(stored.retention_days),
    warningBanThreshold: Number(stored.warning_ban_threshold),
    autoBanHours: Number(stored.auto_ban_hours),
    uploadLimitPerHour: Number(stored.upload_limit_per_hour),
    violationAction: stored.violation_action as ViolationAction,
    aiModerationEnabled: body.aiModerationEnabled === true,
    aiFailMode: stored.ai_fail_mode as AiFailMode,
    aiModel,
    aiPolicy: stored.ai_policy,
    siteNotice: stored.site_notice,
    auditLogDays: Number(stored.audit_log_days),
  };
  if (isDemoMode(env)) {
    return jsonOk({
      settings: settingsForAdmin(preview),
      simulated: true,
    });
  }
  const now = Date.now();
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
  return jsonOk({ settings: settingsForAdmin(preview), simulated: false });
}

export function GET(request: Request) {
  return withApiErrorBoundary("Admin settings read failed", () => get(request));
}

export function PUT(request: Request) {
  return withApiErrorBoundary("Admin settings update failed", () =>
    put(request),
  );
}
