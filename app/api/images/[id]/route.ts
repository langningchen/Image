import { cloudflareEnv } from "@/lib/cloudflare";
import {
  jsonError,
  jsonOk,
  requestHasSameOrigin,
  withApiErrorBoundary,
} from "@/lib/http";
import { constantTimeEqual, sha256Hex } from "@/lib/security";
import { getSettings } from "@/lib/settings";
import { deleteStoredImages, getStorageConfig } from "@/lib/storage";
import { logModerationEvent } from "@/lib/subjects";
import type { ImageRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const ID_PATTERN = /^[A-Za-z0-9_-]{20,32}$/u;

async function remove(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  if (!requestHasSameOrigin(request)) return jsonError("INVALID_ORIGIN", 403);
  const { id } = await context.params;
  if (!ID_PATTERN.test(id)) return jsonError("INVALID_ID", 400);
  const token = request.headers.get("x-delete-token") ?? "";
  if (!token || token.length > 256)
    return jsonError("DELETE_TOKEN_REQUIRED", 401);

  const env = cloudflareEnv();
  const [settings, image] = await Promise.all([
    getSettings(env.DB),
    env.DB.prepare("SELECT * FROM images WHERE id = ?")
      .bind(id)
      .first<ImageRecord>(),
  ]);
  if (!settings.allowUploaderDelete)
    return jsonError("UPLOADER_DELETE_DISABLED", 403);
  if (!image) return jsonError("NOT_FOUND", 404);
  const providedHash = await sha256Hex(token);
  if (!constantTimeEqual(providedHash, image.delete_token_hash))
    return jsonError("INVALID_DELETE_TOKEN", 403);

  const claimAt = Date.now();
  const claimed = await env.DB.prepare(
    `UPDATE images SET deletion_pending = ?
     WHERE id = ? AND deletion_pending = 0
     RETURNING *`,
  )
    .bind(claimAt, id)
    .first<ImageRecord>();
  if (!claimed) return jsonError("NOT_FOUND", 404);
  try {
    const storage = await getStorageConfig(env);
    await deleteStoredImages(env, storage, [claimed]);
    await env.DB.prepare(
      "DELETE FROM images WHERE id = ? AND deletion_pending = ?",
    )
      .bind(id, claimAt)
      .run();
    await logModerationEvent(env.DB, {
      imageId: id,
      subjectId: image.uploader_subject_id,
      eventType: "uploader_delete",
      actor: "system",
    });
    return jsonOk({ deleted: true });
  } catch (error) {
    await env.DB.prepare(
      `UPDATE images SET deletion_pending = 0
       WHERE id = ? AND deletion_pending = ?`,
    )
      .bind(id, claimAt)
      .run();
    console.error("Uploader image deletion failed", error);
    return jsonError("DELETE_FAILED", 503);
  }
}

export function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiErrorBoundary("Uploader image deletion request failed", () =>
    remove(request, context),
  );
}
