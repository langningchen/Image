import { getCloudflareContext } from "@opennextjs/cloudflare";
import { cloudflareEnv } from "@/lib/cloudflare";
import {
  IMAGE_INACTIVITY_RETENTION_MS,
  isHomePreviewRequest,
} from "@/lib/image-retention";
import {
  deleteStoredImages,
  getStorageConfig,
  getStoredImage,
} from "@/lib/storage";
import type { ImageRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const ID_PATTERN = /^[A-Za-z0-9_-]{20,32}$/u;
const TOUCH_INTERVAL_MS = 60 * 60 * 1_000;

function gone(message = "Image not found") {
  return new Response(message, {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}

async function serveImage(
  request: Request,
  context: { params: Promise<{ id: string }> },
  headOnly: boolean,
) {
  const { id } = await context.params;
  if (!ID_PATTERN.test(id)) return gone();
  const env = cloudflareEnv();
  let image = await env.DB.prepare(
    "SELECT * FROM images WHERE id = ? AND deletion_pending = 0",
  )
    .bind(id)
    .first<ImageRecord>();
  if (!image) return gone();

  const now = Date.now();
  let storage: Awaited<ReturnType<typeof getStorageConfig>>;
  try {
    storage = await getStorageConfig(env);
  } catch (error) {
    console.error("Image serving configuration failed", { id, error });
    return new Response("Image storage is temporarily unavailable", {
      status: 502,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  const inactivityCutoff = now - IMAGE_INACTIVITY_RETENTION_MS;
  const expired =
    (image.expires_at !== null && image.expires_at <= now) ||
    (image.expires_at === null && image.last_accessed_at <= inactivityCutoff);
  if (expired) {
    const claimAt = Date.now();
    const claimed = await env.DB.prepare(
      `UPDATE images SET deletion_pending = ?
       WHERE id = ?
         AND deletion_pending = 0
         AND (
           (expires_at IS NOT NULL AND expires_at <= ?)
           OR (expires_at IS NULL AND last_accessed_at <= ?)
         )
       RETURNING *`,
    )
      .bind(claimAt, id, now, inactivityCutoff)
      .first<ImageRecord>();
    if (claimed) {
      const { ctx } = getCloudflareContext();
      ctx.waitUntil(
        deleteStoredImages(env, storage, [claimed])
          .then(() =>
            env.DB.prepare(
              "DELETE FROM images WHERE id = ? AND deletion_pending = ?",
            )
              .bind(id, claimAt)
              .run(),
          )
          .catch(async (error) => {
            console.error("Expired image deletion failed", error);
            await env.DB.prepare(
              `UPDATE images SET deletion_pending = 0
               WHERE id = ? AND deletion_pending = ?`,
            )
              .bind(id, claimAt)
              .run();
          }),
      );
    }
    return gone("Image expired");
  }

  if (
    !isHomePreviewRequest(request) &&
    image.expires_at === null &&
    image.last_accessed_at <= now - TOUCH_INTERVAL_MS
  ) {
    const touched = await env.DB.prepare(
      `UPDATE images
       SET last_accessed_at = ?, view_count = view_count + 1
       WHERE id = ? AND deletion_pending = 0
       RETURNING *`,
    )
      .bind(now, id)
      .first<ImageRecord>();
    if (!touched) return gone("Image expired");
    image = touched;
  }

  try {
    const object = await getStoredImage(env, storage, image);
    if (!object) {
      await env.DB.prepare("DELETE FROM images WHERE id = ?").bind(id).run();
      return gone();
    }
    const expiresAt =
      image.expires_at ??
      image.last_accessed_at + IMAGE_INACTIVITY_RETENTION_MS;
    const cacheSeconds = Math.max(
      0,
      Math.min(3_600, Math.floor((expiresAt - Date.now()) / 1_000)),
    );
    const headers = new Headers({
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}, must-revalidate`,
      "Content-Disposition": "inline",
      "Content-Type": image.content_type,
      "Cross-Origin-Resource-Policy": "cross-origin",
      ETag: object.etag,
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    });
    if (object.size !== null)
      headers.set("Content-Length", String(object.size));
    if (object.uploaded)
      headers.set("Last-Modified", object.uploaded.toUTCString());
    headers.set("X-VanishPic-Expires-At", new Date(expiresAt).toISOString());
    if (request.headers.get("if-none-match") === object.etag) {
      return new Response(null, { status: 304, headers });
    }
    return new Response(headOnly ? null : object.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Image read failed", { id, error });
    return new Response("Image storage is temporarily unavailable", {
      status: 502,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
}

export function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return serveImage(request, context, false);
}

export function HEAD(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return serveImage(request, context, true);
}
