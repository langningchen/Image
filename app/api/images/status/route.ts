import { cloudflareEnv } from "@/lib/cloudflare";
import {
  jsonError,
  jsonOk,
  requestHasSameOrigin,
  withApiErrorBoundary,
} from "@/lib/http";
import { IMAGE_INACTIVITY_RETENTION_MS } from "@/lib/image-retention";
import type { ImageRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

const ID_PATTERN = /^[A-Za-z0-9_-]{20,32}$/u;

async function post(request: Request) {
  if (!requestHasSameOrigin(request)) return jsonError("INVALID_ORIGIN", 403);
  let body: { ids?: unknown };
  try {
    body = (await request.json()) as { ids?: unknown };
  } catch {
    return jsonError("INVALID_JSON", 400);
  }
  if (!Array.isArray(body.ids)) return jsonError("INVALID_IDS", 400);
  const ids = Array.from(
    new Set(
      body.ids.filter(
        (id): id is string => typeof id === "string" && ID_PATTERN.test(id),
      ),
    ),
  ).slice(0, 100);
  if (ids.length === 0) return jsonOk({ images: [] });

  const env = cloudflareEnv();
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await env.DB.prepare(
    `SELECT id, original_name, content_type, byte_size, created_at,
              last_accessed_at, expires_at, moderation_status
       FROM images
       WHERE deletion_pending = 0 AND id IN (${placeholders})`,
  )
    .bind(...ids)
    .all<
      Pick<
        ImageRecord,
        | "id"
        | "original_name"
        | "content_type"
        | "byte_size"
        | "created_at"
        | "last_accessed_at"
        | "expires_at"
        | "moderation_status"
      >
    >();
  return jsonOk({
    images: results.map((image) => ({
      id: image.id,
      originalName: image.original_name,
      contentType: image.content_type,
      byteSize: image.byte_size,
      createdAt: image.created_at,
      lastAccessedAt: image.last_accessed_at,
      expiresAt:
        image.expires_at ??
        image.last_accessed_at + IMAGE_INACTIVITY_RETENTION_MS,
      moderationStatus: image.moderation_status,
    })),
  });
}

export function POST(request: Request) {
  return withApiErrorBoundary("Image status lookup failed", () =>
    post(request),
  );
}
