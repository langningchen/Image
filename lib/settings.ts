import { IMAGE_INACTIVITY_RETENTION_DAYS } from "@/lib/image-retention";
import type {
  AccessMode,
  AiFailMode,
  AppSettings,
  ViolationAction,
} from "@/lib/types";

export const DEFAULT_AI_MODEL = "@cf/mistralai/mistral-small-3.1-24b-instruct";

const DEFAULTS: AppSettings = {
  siteName: "VanishPic",
  uploadTitle: "Upload an image",
  uploadDescription: "",
  siteFooter: "",
  showRecentUploads: true,
  pasteUploadEnabled: true,
  maxBatchSize: 20,
  uploadConcurrency: 3,
  historyLimit: 24,
  allowUploaderDelete: true,
  showExpiryTime: true,
  showViewCount: true,
  accessMode: "public",
  accessPasswordHash: "",
  retentionDays: IMAGE_INACTIVITY_RETENTION_DAYS,
  warningBanThreshold: 3,
  autoBanHours: 168,
  uploadLimitPerHour: 30,
  violationAction: "delete_warn",
  aiModerationEnabled: false,
  aiFailMode: "allow",
  aiModel: DEFAULT_AI_MODEL,
  aiPolicy:
    "Reject explicit sexual content or nudity, sexualized minors, graphic gore, credible violence, extremist propaganda, hateful imagery, illegal drug sales, and instructions or promotion of serious wrongdoing.",
  siteNotice: "",
  auditLogDays: 90,
};

const clampInteger = (
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, parsed))
    : fallback;
};

const oneOf = <T extends string>(
  value: string | undefined,
  allowed: readonly T[],
  fallback: T,
): T => (allowed.includes(value as T) ? (value as T) : fallback);

export async function getSettings(db: D1Database): Promise<AppSettings> {
  const { results } = await db
    .prepare("SELECT key, value FROM settings")
    .all<{ key: string; value: string }>();
  const values = Object.fromEntries(
    results.map(({ key, value }) => [key, value]),
  );

  return {
    siteName: values.site_name?.trim() || DEFAULTS.siteName,
    uploadTitle: values.upload_title?.trim() || DEFAULTS.uploadTitle,
    uploadDescription:
      values.upload_description?.trim() || DEFAULTS.uploadDescription,
    siteFooter: values.site_footer?.trim() || DEFAULTS.siteFooter,
    showRecentUploads: values.show_recent_uploads !== "false",
    pasteUploadEnabled: values.paste_upload_enabled !== "false",
    maxBatchSize: clampInteger(
      values.max_batch_size,
      DEFAULTS.maxBatchSize,
      1,
      50,
    ),
    uploadConcurrency: clampInteger(
      values.upload_concurrency,
      DEFAULTS.uploadConcurrency,
      1,
      6,
    ),
    historyLimit: clampInteger(
      values.history_limit,
      DEFAULTS.historyLimit,
      1,
      100,
    ),
    allowUploaderDelete: values.allow_uploader_delete !== "false",
    showExpiryTime: values.show_expiry_time !== "false",
    showViewCount: values.show_view_count !== "false",
    accessMode: oneOf<AccessMode>(
      values.access_mode,
      ["public", "password"],
      DEFAULTS.accessMode,
    ),
    accessPasswordHash: values.access_password_hash ?? "",
    retentionDays: IMAGE_INACTIVITY_RETENTION_DAYS,
    warningBanThreshold: clampInteger(
      values.warning_ban_threshold,
      DEFAULTS.warningBanThreshold,
      0,
      100,
    ),
    autoBanHours: clampInteger(
      values.auto_ban_hours,
      DEFAULTS.autoBanHours,
      0,
      24 * 365,
    ),
    uploadLimitPerHour: clampInteger(
      values.upload_limit_per_hour,
      DEFAULTS.uploadLimitPerHour,
      1,
      1_000,
    ),
    violationAction: oneOf<ViolationAction>(
      values.violation_action,
      ["delete", "delete_warn"],
      DEFAULTS.violationAction,
    ),
    aiModerationEnabled: values.ai_moderation_enabled === "true",
    aiFailMode: oneOf<AiFailMode>(
      values.ai_fail_mode,
      ["allow", "block"],
      DEFAULTS.aiFailMode,
    ),
    aiModel: values.ai_model?.trim() || DEFAULTS.aiModel,
    aiPolicy: values.ai_policy?.trim() || DEFAULTS.aiPolicy,
    siteNotice: values.site_notice?.trim() || DEFAULTS.siteNotice,
    auditLogDays: clampInteger(
      values.audit_log_days,
      DEFAULTS.auditLogDays,
      7,
      365,
    ),
  };
}

export async function saveSetting(
  db: D1Database,
  key: string,
  value: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
    )
    .bind(key, value, Date.now())
    .run();
}

export function settingsForClient(settings: AppSettings) {
  return {
    siteName: settings.siteName,
    uploadTitle: settings.uploadTitle,
    uploadDescription: settings.uploadDescription,
    siteFooter: settings.siteFooter,
    showRecentUploads: settings.showRecentUploads,
    pasteUploadEnabled: settings.pasteUploadEnabled,
    maxBatchSize: settings.maxBatchSize,
    uploadConcurrency: settings.uploadConcurrency,
    historyLimit: settings.historyLimit,
    allowUploaderDelete: settings.allowUploaderDelete,
    showExpiryTime: settings.showExpiryTime,
    showViewCount: settings.showViewCount,
    accessMode: settings.accessMode,
    retentionDays: settings.retentionDays,
    siteNotice: settings.siteNotice,
    aiModerationEnabled: settings.aiModerationEnabled,
  };
}
