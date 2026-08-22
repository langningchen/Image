import { hasUploadAccess } from "@/lib/auth";
import { cloudflareEnv } from "@/lib/cloudflare";
import { DEMO_EXPIRY_MINUTES, isDemoMode } from "@/lib/demo";
import {
  getClientIp,
  jsonError,
  jsonOk,
  requestHasSameOrigin,
  withApiErrorBoundary,
} from "@/lib/http";
import { IMAGE_INACTIVITY_RETENTION_MS } from "@/lib/image-retention";
import {
  ImageValidationError,
  maxUploadBytes,
  validateImage,
} from "@/lib/image-validation";
import { moderateImage } from "@/lib/moderation";
import { randomToken, sha256Hex } from "@/lib/security";
import { getSettings } from "@/lib/settings";
import {
  deleteStoredImages,
  getStorageConfig,
  putStoredImage,
} from "@/lib/storage";
import {
  consumeUploadQuota,
  logModerationEvent,
  normalizeExpiredBan,
  resolveSubject,
  subjectIsBanned,
  subjectNotice,
  warnSubject,
} from "@/lib/subjects";

export const dynamic = "force-dynamic";

async function post(request: Request) {
  if (!requestHasSameOrigin(request)) return jsonError("INVALID_ORIGIN", 403);
  const env = cloudflareEnv();
  const demoMode = isDemoMode(env);
  let settings: Awaited<ReturnType<typeof getSettings>>;
  let storage: Awaited<ReturnType<typeof getStorageConfig>>;
  try {
    [settings, storage] = await Promise.all([
      getSettings(env.DB),
      getStorageConfig(env),
    ]);
  } catch (error) {
    console.error("Upload configuration failed", error);
    return jsonError("NOT_CONFIGURED", 503);
  }
  if (!storage.setupCompleted) return jsonError("NOT_CONFIGURED", 503);
  if (!demoMode && !(await hasUploadAccess(request, settings, env)))
    return jsonError("ACCESS_REQUIRED", 401);

  const ip = getClientIp(request);
  let subject = await resolveSubject(env.DB, ip, env.IP_HASH_SECRET, true);
  if (!subject) return jsonError("SUBJECT_UNAVAILABLE", 503);
  subject = await normalizeExpiredBan(env.DB, subject);
  if (subjectIsBanned(subject)) {
    return jsonError(
      subject.permanent_ban
        ? "UPLOADER_PERMANENTLY_BANNED"
        : "UPLOADER_TEMPORARILY_BANNED",
      403,
      subject.banned_until ? { bannedUntil: subject.banned_until } : undefined,
    );
  }

  const quota = await consumeUploadQuota(
    env.DB,
    subject.id,
    settings.uploadLimitPerHour,
  );
  if (!quota.allowed) {
    const response = jsonError("UPLOAD_RATE_LIMITED", 429, {
      retryAfterSeconds: quota.retryAfterSeconds,
    });
    response.headers.set("Retry-After", String(quota.retryAfterSeconds));
    return response;
  }

  const maxBytes = maxUploadBytes(env);
  const contentLength = Number.parseInt(
    request.headers.get("content-length") ?? "",
    10,
  );
  if (Number.isFinite(contentLength) && contentLength > maxBytes + 1_048_576) {
    return jsonError("FILE_TOO_LARGE", 413, {
      maxMiB: Math.floor(maxBytes / 1_048_576),
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (
      !file ||
      typeof file === "string" ||
      typeof file.arrayBuffer !== "function"
    ) {
      return jsonError("FILE_REQUIRED", 400);
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const validated = validateImage(file, bytes, maxBytes);
    const moderation = await moderateImage(
      env,
      bytes,
      validated.contentType,
      settings,
    );

    if (moderation.status === "blocked") {
      await logModerationEvent(env.DB, {
        subjectId: subject.id,
        eventType: "ai_rejected",
        actor: "ai",
        reason: moderation.reason,
        details: JSON.stringify(moderation),
      });
      if (!demoMode && settings.violationAction === "delete_warn") {
        await warnSubject(
          env.DB,
          subject.id,
          moderation.reason,
          settings,
          "ai",
        );
      }
      return jsonError("MODERATION_REJECTED", 422);
    }
    if (moderation.status === "error") {
      await logModerationEvent(env.DB, {
        subjectId: subject.id,
        eventType: "ai_error",
        actor: "system",
        reason: moderation.reason,
      });
      if (settings.aiFailMode === "block") {
        return jsonError("MODERATION_UNAVAILABLE", 503);
      }
    }

    const id = randomToken(18);
    const deleteToken = randomToken(32);
    const createdAt = Date.now();
    const expiresAt = demoMode
      ? createdAt + DEMO_EXPIRY_MINUTES * 60_000
      : null;
    const stored = await putStoredImage(env, storage, {
      id,
      extension: validated.extension,
      contentType: validated.contentType,
      bytes,
    });
    try {
      await env.DB.prepare(
        `INSERT INTO images (
           id, object_key, original_name, content_type, byte_size,
           created_at, last_accessed_at, expires_at, view_count,
           delete_token_hash, uploader_subject_id, storage_backend, storage_ref,
           moderation_status, moderation_reason, deletion_pending
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, 0)`,
      )
        .bind(
          id,
          stored.objectKey,
          validated.safeName,
          validated.contentType,
          file.size,
          createdAt,
          createdAt,
          expiresAt,
          await sha256Hex(deleteToken),
          subject.id,
          stored.backend,
          stored.storageRef,
          moderation.status,
          moderation.reason,
        )
        .run();
    } catch (error) {
      await deleteStoredImages(env, storage, [
        {
          id,
          object_key: stored.objectKey,
          storage_backend: stored.backend,
          storage_ref: stored.storageRef,
        },
      ]);
      throw error;
    }

    const url = new URL(`/${id}`, request.url).href;
    return jsonOk(
      {
        image: {
          id,
          url,
          deleteToken,
          originalName: validated.safeName,
          contentType: validated.contentType,
          byteSize: file.size,
          createdAt,
          lastAccessedAt: createdAt,
          expiresAt: expiresAt ?? createdAt + IMAGE_INACTIVITY_RETENTION_MS,
          moderationStatus: moderation.status,
        },
        warning: subjectNotice(subject),
      },
      201,
    );
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return jsonError(error.code, error.status, error.params);
    }
    console.error("Image upload failed", error);
    return jsonError("UPLOAD_FAILED", 500);
  }
}

export function POST(request: Request) {
  return withApiErrorBoundary("Image upload request failed", () =>
    post(request),
  );
}
