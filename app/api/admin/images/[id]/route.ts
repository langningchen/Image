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
import { getSettings } from "@/lib/settings";
import { deleteStoredImages, getStorageConfig } from "@/lib/storage";
import { logModerationEvent, warnSubject } from "@/lib/subjects";
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
  const env = cloudflareEnv();
  const demoMode = isDemoMode(env);
  if (!(await isAdmin(request, env)) && !demoMode)
    return jsonError("UNAUTHORIZED", 401);

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // A request body is optional for simple deletion.
  }
  const warn = body.warn === true;
  const reason = truncate(
    typeof body.reason === "string" ? body.reason : "",
    500,
  );
  if (demoMode) return jsonOk({ deleted: true, warned: warn, simulated: true });

  const image = await env.DB.prepare(
    "SELECT * FROM images WHERE id = ? AND deletion_pending = 0",
  )
    .bind(id)
    .first<ImageRecord>();
  if (!image) return jsonError("NOT_FOUND", 404);
  try {
    const [storage, settings] = await Promise.all([
      getStorageConfig(env),
      getSettings(env.DB),
    ]);
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
      await deleteStoredImages(env, storage, [claimed]);
      await env.DB.prepare(
        "DELETE FROM images WHERE id = ? AND deletion_pending = ?",
      )
        .bind(id, claimAt)
        .run();
    } catch (error) {
      await env.DB.prepare(
        `UPDATE images SET deletion_pending = 0
         WHERE id = ? AND deletion_pending = ?`,
      )
        .bind(id, claimAt)
        .run();
      throw error;
    }
    await logModerationEvent(env.DB, {
      imageId: id,
      subjectId: image.uploader_subject_id,
      eventType: "admin_delete",
      actor: "admin",
      reason,
    });
    if (warn) {
      await warnSubject(
        env.DB,
        image.uploader_subject_id,
        reason,
        settings,
        "admin",
      );
    }
    return jsonOk({ deleted: true, warned: warn, simulated: false });
  } catch (error) {
    console.error("Admin image deletion failed", error);
    return jsonError("DELETE_FAILED", 503);
  }
}

export function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return withApiErrorBoundary("Admin image deletion request failed", () =>
    remove(request, context),
  );
}
