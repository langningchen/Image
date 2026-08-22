import { DAY_MS, IMAGE_INACTIVITY_RETENTION_MS } from "@/lib/image-retention";
import { getSettings } from "@/lib/settings";
import { deleteStoredImages, getStorageConfig } from "@/lib/storage";
import type { ImageRecord } from "@/lib/types";

const BATCH_SIZE = 20;
const MAX_BATCHES = 5;
const CLAIM_LEASE_MS = 10 * 60 * 1_000;

type CleanupCandidate = Pick<
  ImageRecord,
  "id" | "object_key" | "storage_backend" | "storage_ref"
>;

export async function cleanupExpiredImages(
  env: CloudflareEnv,
): Promise<{ deleted: number; failed: number }> {
  const settings = await getSettings(env.DB);
  const storage = await getStorageConfig(env);
  const cutoff = Date.now() - IMAGE_INACTIVITY_RETENTION_MS;
  let deleted = 0;
  let failed = 0;

  for (let batch = 0; batch < MAX_BATCHES; batch += 1) {
    const now = Date.now();
    const staleClaimCutoff = now - CLAIM_LEASE_MS;
    const { results: candidates } = await env.DB.prepare(
      `SELECT id, object_key
       FROM images
       WHERE (
         deletion_pending = 0
         AND (
           (expires_at IS NOT NULL AND expires_at < ?)
           OR (expires_at IS NULL AND last_accessed_at < ?)
         )
       ) OR (
         deletion_pending > 0
         AND deletion_pending <= ?
       )
       ORDER BY deletion_pending > 0 DESC,
                COALESCE(expires_at, last_accessed_at) ASC
       LIMIT ?`,
    )
      .bind(now, cutoff, staleClaimCutoff, BATCH_SIZE)
      .all<CleanupCandidate>();
    if (candidates.length === 0) break;

    const claimAt = Date.now();
    const claims = await env.DB.batch(
      candidates.map(({ id }) =>
        env.DB.prepare(
          `UPDATE images
           SET deletion_pending = ?
           WHERE id = ?
             AND (
               (
                 deletion_pending = 0
                 AND (
                   (expires_at IS NOT NULL AND expires_at < ?)
                   OR (expires_at IS NULL AND last_accessed_at < ?)
                 )
               ) OR (
                 deletion_pending > 0
                 AND deletion_pending <= ?
               )
             )
           RETURNING id, object_key, storage_backend, storage_ref`,
        ).bind(claimAt, id, now, cutoff, staleClaimCutoff),
      ),
    );
    const claimed = claims.flatMap(
      (claim) => (claim.results ?? []) as unknown as CleanupCandidate[],
    );
    if (claimed.length === 0) continue;

    try {
      await deleteStoredImages(env, storage, claimed);
      await env.DB.batch(
        claimed.map(({ id }) =>
          env.DB.prepare(
            "DELETE FROM images WHERE id = ? AND deletion_pending = ?",
          ).bind(id, claimAt),
        ),
      );
      deleted += claimed.length;
    } catch (error) {
      failed += claimed.length;
      console.error("Scheduled image cleanup failed", {
        count: claimed.length,
        error: error instanceof Error ? error.message : String(error),
      });
      await env.DB.batch(
        claimed.map(({ id }) =>
          env.DB.prepare(
            `UPDATE images
             SET deletion_pending = 0
             WHERE id = ? AND deletion_pending = ?`,
          ).bind(id, claimAt),
        ),
      );
      break;
    }
  }

  const now = Date.now();
  const auditCutoff = now - settings.auditLogDays * DAY_MS;
  await env.DB.batch([
    env.DB.prepare(
      `UPDATE subjects
       SET banned_until = NULL,
           ban_reason_code = NULL,
           ban_reason_detail = NULL,
           notice_params = CASE
             WHEN notice_code = 'UPLOADER_TEMPORARILY_BANNED' THEN NULL
             ELSE notice_params
           END,
           notice_detail = CASE
             WHEN notice_code = 'UPLOADER_TEMPORARILY_BANNED' THEN NULL
             ELSE notice_detail
           END,
           notice_code = CASE
             WHEN notice_code = 'UPLOADER_TEMPORARILY_BANNED' THEN NULL
             ELSE notice_code
           END
       WHERE permanent_ban = 0 AND banned_until IS NOT NULL AND banned_until <= ?`,
    ).bind(now),
    env.DB.prepare("DELETE FROM moderation_events WHERE created_at < ?").bind(
      auditCutoff,
    ),
    env.DB.prepare(
      "DELETE FROM auth_attempts WHERE window_started_at < ?",
    ).bind(now - 30 * DAY_MS),
    env.DB.prepare(
      `DELETE FROM subjects
       WHERE warning_count = 0
         AND permanent_ban = 0
         AND banned_until IS NULL
         AND last_seen_at < ?
         AND NOT EXISTS (
           SELECT 1 FROM images WHERE uploader_subject_id = subjects.id
         )`,
    ).bind(now - 180 * DAY_MS),
  ]);

  return { deleted, failed };
}
