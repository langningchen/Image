import { settingsForAdmin } from "@/lib/admin-settings";
import { isAdmin } from "@/lib/auth";
import { cloudflareEnv } from "@/lib/cloudflare";
import { isDemoMode } from "@/lib/demo";
import { jsonError, jsonOk, withApiErrorBoundary } from "@/lib/http";
import { IMAGE_INACTIVITY_RETENTION_MS } from "@/lib/image-retention";
import { getSettings } from "@/lib/settings";
import { getStorageConfig } from "@/lib/storage";
import type { ImageRecord, SubjectRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

interface CountRow {
  count: number;
}

interface EventRow {
  id: number;
  image_id: string | null;
  subject_id: string;
  event_type: string;
  actor: string;
  reason: string | null;
  details: string | null;
  created_at: number;
}

async function get(request: Request) {
  const env = cloudflareEnv();
  const demoMode = isDemoMode(env);
  if (!(await isAdmin(request, env)) && !demoMode)
    return jsonError("UNAUTHORIZED", 401);

  const [
    settings,
    storage,
    imageCount,
    subjectCount,
    bannedCount,
    byteCount,
    images,
    subjects,
    events,
  ] = await Promise.all([
    getSettings(env.DB),
    getStorageConfig(env),
    env.DB.prepare(
      "SELECT COUNT(*) AS count FROM images WHERE deletion_pending = 0",
    ).first<CountRow>(),
    env.DB.prepare("SELECT COUNT(*) AS count FROM subjects").first<CountRow>(),
    env.DB.prepare(
      `SELECT COUNT(*) AS count FROM subjects
       WHERE permanent_ban = 1 OR banned_until > ?`,
    )
      .bind(Date.now())
      .first<CountRow>(),
    env.DB.prepare(
      "SELECT COALESCE(SUM(byte_size), 0) AS count FROM images WHERE deletion_pending = 0",
    ).first<CountRow>(),
    env.DB.prepare(
      `SELECT i.*, s.ip_masked
       FROM images i
       LEFT JOIN subjects s ON s.id = i.uploader_subject_id
       WHERE i.deletion_pending = 0
       ORDER BY i.created_at DESC
       LIMIT 100`,
    ).all<ImageRecord & { ip_masked: string | null }>(),
    env.DB.prepare(
      `SELECT * FROM subjects
       ORDER BY
         CASE WHEN permanent_ban = 1 OR banned_until > ? THEN 0 ELSE 1 END,
         last_seen_at DESC
       LIMIT 100`,
    )
      .bind(Date.now())
      .all<SubjectRecord>(),
    env.DB.prepare(
      `SELECT * FROM moderation_events
       ORDER BY created_at DESC
       LIMIT 100`,
    ).all<EventRow>(),
  ]);

  return jsonOk({
    demoMode,
    stats: {
      images: imageCount?.count ?? 0,
      subjects: subjectCount?.count ?? 0,
      banned: bannedCount?.count ?? 0,
      bytes: byteCount?.count ?? 0,
    },
    setup: {
      setupCompleted: storage.setupCompleted,
      backend: storage.backend,
      githubOwner: storage.githubOwner,
      githubRepo: storage.githubRepo,
      githubBranch: storage.githubBranch,
      githubPatConfigured: Boolean(storage.githubPatEncrypted),
    },
    settings: settingsForAdmin(settings),
    images: images.results.map((image) => ({
      id: image.id,
      originalName: image.original_name,
      contentType: image.content_type,
      byteSize: image.byte_size,
      createdAt: image.created_at,
      lastAccessedAt: image.last_accessed_at,
      expiresAt:
        image.expires_at ??
        image.last_accessed_at + IMAGE_INACTIVITY_RETENTION_MS,
      viewCount: image.view_count,
      subjectId: image.uploader_subject_id,
      ipMasked: image.ip_masked,
      moderationStatus: image.moderation_status,
      moderationReason: image.moderation_reason,
      storageBackend: image.storage_backend,
    })),
    subjects: subjects.results.map((subject) => ({
      id: subject.id,
      ipMasked: subject.ip_masked,
      warningCount: subject.warning_count,
      permanentBan: subject.permanent_ban === 1,
      bannedUntil: subject.banned_until,
      banReason: subject.ban_reason_code
        ? {
            code: subject.ban_reason_code,
            ...(subject.ban_reason_detail
              ? { detail: subject.ban_reason_detail }
              : {}),
          }
        : null,
      createdAt: subject.created_at,
      lastSeenAt: subject.last_seen_at,
      uploadCount: subject.upload_count,
    })),
    events: events.results.map((event) => ({
      id: event.id,
      imageId: event.image_id,
      subjectId: event.subject_id,
      eventType: event.event_type,
      actor: event.actor,
      reason: event.reason,
      details: event.details,
      createdAt: event.created_at,
    })),
  });
}

export function GET(request: Request) {
  return withApiErrorBoundary("Admin overview failed", () => get(request));
}
