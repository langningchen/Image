import { maskIp, truncate } from "@/lib/http";
import { subjectIdForIp } from "@/lib/security";
import type { AppSettings, SubjectRecord } from "@/lib/types";

export async function resolveSubject(
  db: D1Database,
  ip: string,
  secret: string,
  touch = false,
): Promise<SubjectRecord | null> {
  const id = await subjectIdForIp(ip, secret);
  if (touch) {
    const now = Date.now();
    await db
      .prepare(
        `INSERT INTO subjects (
           id, ip_masked, warning_count, permanent_ban, created_at, last_seen_at
         ) VALUES (?, ?, 0, 0, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           ip_masked = excluded.ip_masked,
           last_seen_at = excluded.last_seen_at`,
      )
      .bind(id, maskIp(ip), now, now)
      .run();
  }
  return db
    .prepare("SELECT * FROM subjects WHERE id = ?")
    .bind(id)
    .first<SubjectRecord>();
}

export async function normalizeExpiredBan(
  db: D1Database,
  subject: SubjectRecord,
): Promise<SubjectRecord> {
  if (
    !subject.permanent_ban &&
    subject.banned_until &&
    subject.banned_until <= Date.now()
  ) {
    await db
      .prepare(
        `UPDATE subjects
         SET banned_until = NULL,
             ban_reason_code = NULL,
             ban_reason_detail = NULL,
             notice_code = CASE
               WHEN notice_code = 'UPLOADER_TEMPORARILY_BANNED' THEN NULL
               ELSE notice_code
             END,
             notice_params = CASE
               WHEN notice_code = 'UPLOADER_TEMPORARILY_BANNED' THEN NULL
               ELSE notice_params
             END,
             notice_detail = CASE
               WHEN notice_code = 'UPLOADER_TEMPORARILY_BANNED' THEN NULL
               ELSE notice_detail
             END
         WHERE id = ? AND permanent_ban = 0 AND banned_until <= ?`,
      )
      .bind(subject.id, Date.now())
      .run();
    const clearNotice = subject.notice_code === "UPLOADER_TEMPORARILY_BANNED";
    return {
      ...subject,
      banned_until: null,
      ban_reason_code: null,
      ban_reason_detail: null,
      ...(clearNotice
        ? {
            notice_code: null,
            notice_params: null,
            notice_detail: null,
          }
        : {}),
    };
  }
  return subject;
}

export function subjectIsBanned(subject: SubjectRecord): boolean {
  return (
    subject.permanent_ban === 1 ||
    (subject.banned_until !== null && subject.banned_until > Date.now())
  );
}

export async function consumeUploadQuota(
  db: D1Database,
  subjectId: string,
  limitPerHour: number,
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const now = Date.now();
  const windowMs = 3_600_000;
  const subject = await db
    .prepare(
      `UPDATE subjects
       SET upload_count = CASE
             WHEN upload_window_started_at IS NULL
               OR upload_window_started_at <= ? THEN 1
             ELSE upload_count + 1
           END,
           upload_window_started_at = CASE
             WHEN upload_window_started_at IS NULL
               OR upload_window_started_at <= ? THEN ?
             ELSE upload_window_started_at
           END,
           last_seen_at = ?
       WHERE id = ?
       RETURNING upload_count, upload_window_started_at`,
    )
    .bind(now - windowMs, now - windowMs, now, now, subjectId)
    .first<Pick<SubjectRecord, "upload_count" | "upload_window_started_at">>();
  if (!subject) return { allowed: false, retryAfterSeconds: 3_600 };
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil(
      ((subject.upload_window_started_at ?? now) + windowMs - now) / 1_000,
    ),
  );
  return {
    allowed: subject.upload_count <= limitPerHour,
    retryAfterSeconds,
  };
}

export async function warnSubject(
  db: D1Database,
  subjectId: string,
  reason: string,
  settings: AppSettings,
  actor: "admin" | "ai",
): Promise<SubjectRecord | null> {
  const now = Date.now();
  const detail = truncate(reason, 500) || null;
  const threshold = settings.warningBanThreshold;
  const autoBanUntil =
    settings.autoBanHours === 0
      ? null
      : now + settings.autoBanHours * 3_600_000;
  const permanentOnThreshold =
    threshold > 0 && settings.autoBanHours === 0 ? 1 : 0;

  const subject = await db
    .prepare(
      `UPDATE subjects
       SET warning_count = warning_count + 1,
           notice_code = ?,
           notice_params = ?,
           notice_detail = ?,
           permanent_ban = CASE
             WHEN ? > 0 AND warning_count + 1 >= ?
               THEN MAX(permanent_ban, ?)
             ELSE permanent_ban
           END,
           banned_until = CASE
             WHEN ? > 0
               AND warning_count + 1 >= ?
               AND permanent_ban = 0
               AND ? IS NOT NULL
               THEN MAX(COALESCE(banned_until, 0), ?)
             ELSE banned_until
           END,
           ban_reason_code = CASE
             WHEN ? > 0
               AND warning_count + 1 >= ?
               AND permanent_ban = 0
               THEN ?
             ELSE ban_reason_code
           END,
           ban_reason_detail = CASE
             WHEN ? > 0
               AND warning_count + 1 >= ?
               AND permanent_ban = 0
               THEN NULL
             ELSE ban_reason_detail
           END,
           last_seen_at = ?
       WHERE id = ?
       RETURNING *`,
    )
    .bind(
      "UPLOADER_WARNED",
      JSON.stringify({ warningBanThreshold: threshold }),
      detail,
      threshold,
      threshold,
      permanentOnThreshold,
      threshold,
      threshold,
      autoBanUntil,
      autoBanUntil,
      threshold,
      threshold,
      "AUTO_WARNING_THRESHOLD",
      threshold,
      threshold,
      now,
      subjectId,
    )
    .first<SubjectRecord>();

  await logModerationEvent(db, {
    subjectId,
    eventType: "warning",
    actor,
    reason: detail,
    details: subject
      ? JSON.stringify({
          warningCount: subject.warning_count,
          autoBanned: subjectIsBanned(subject),
        })
      : null,
  });
  return subject;
}

export function subjectNotice(subject: SubjectRecord | null): {
  code: string;
  params?: Record<string, string | number | boolean | null>;
  detail?: string;
} | null {
  if (!subject?.notice_code) return null;
  let params: Record<string, string | number | boolean | null> | undefined;
  if (subject.notice_params) {
    try {
      const parsed = JSON.parse(subject.notice_params) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        params = parsed as Record<string, string | number | boolean | null>;
      }
    } catch {
      // Ignore malformed legacy metadata; the stable notice code remains usable.
    }
  }
  return {
    code: subject.notice_code,
    ...(params ? { params } : {}),
    ...(subject.notice_detail ? { detail: subject.notice_detail } : {}),
  };
}

export async function logModerationEvent(
  db: D1Database,
  event: {
    imageId?: string | null;
    subjectId: string;
    eventType: string;
    actor: "admin" | "ai" | "system";
    reason?: string | null;
    details?: string | null;
  },
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO moderation_events (
         image_id, subject_id, event_type, actor, reason, details, created_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      event.imageId ?? null,
      event.subjectId,
      event.eventType,
      event.actor,
      event.reason ?? null,
      event.details ?? null,
      Date.now(),
    )
    .run();
}
