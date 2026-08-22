"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import {
  mergeHistory,
  readHistory,
  saveHistory,
} from "@/components/home/history-storage";
import type {
  LocalImage,
  PublicConfigResponse,
  StatusResponse,
  StructuredMessage,
  UploadProgress,
  UploadResponse,
} from "@/components/home/types";
import { usePasteImages } from "@/components/home/use-paste-images";
import type { UiMessage } from "@/components/notification-center";
import { useApiError } from "@/components/use-api-error";
import { apiFetch } from "@/lib/api-client";
import { mapConcurrent } from "@/lib/concurrency";

function intlParams(
  params?: Record<string, string | number | boolean | null>,
): Record<string, string | number> {
  return Object.fromEntries(
    Object.entries(params ?? {})
      .filter(
        (entry): entry is [string, string | number | boolean] =>
          entry[1] !== null,
      )
      .map(([key, value]) => [
        key,
        typeof value === "boolean" ? String(value) : value,
      ]),
  );
}

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

export function useHomeUploader() {
  const t = useTranslations("Home");
  const notices = useTranslations("Notices");
  const translateError = useApiError();
  const [config, setConfig] = useState<PublicConfigResponse | null>(null);
  const [history, setHistory] = useState<LocalImage[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [password, setPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [deleting, setDeleting] = useState<LocalImage | null>(null);
  const [message, setMessage] = useState<UiMessage | null>(null);

  const translateNotice = useCallback(
    (notice: StructuredMessage | null) => {
      if (!notice) return null;
      const base = notices.has(notice.code)
        ? notices(notice.code, intlParams(notice.params))
        : notice.code;
      return notice.detail ? `${base} ${notice.detail}` : base;
    },
    [notices],
  );

  const loadConfig = useCallback(async () => {
    try {
      const next = await apiFetch<PublicConfigResponse>("/api/config");
      setConfig(next);
      setHistory((current) => {
        const limited = current.slice(0, next.config.historyLimit);
        saveHistory(limited, next.config.historyLimit);
        return limited;
      });
    } catch (error) {
      setMessage({ severity: "error", text: translateError(error) });
    }
  }, [translateError]);

  useEffect(() => {
    const local = readHistory();
    setHistory(local);
    void loadConfig();
    if (local.length === 0) return;
    void apiFetch<StatusResponse>("/api/images/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: local.map(({ id }) => id) }),
    })
      .then((result) => {
        const live = new Map(result.images.map((image) => [image.id, image]));
        const next = local
          .filter(({ id }) => live.has(id))
          .map((image) => ({ ...image, ...live.get(image.id) }));
        setHistory(next);
        saveHistory(next);
      })
      .catch(() => {
        // Keep local history available when synchronization is unavailable.
      });
  }, [loadConfig]);

  const addFiles = useCallback(
    (additions: File[]) => {
      const limit = config?.config.maxBatchSize ?? 20;
      setFiles((current) => {
        const known = new Set(current.map(fileKey));
        const unique = additions.filter((file) => !known.has(fileKey(file)));
        const next = [...current, ...unique];
        if (next.length > limit) {
          setMessage({
            severity: "warning",
            text: t("batchLimit", { count: limit }),
          });
        }
        return next.slice(0, limit);
      });
    },
    [config?.config.maxBatchSize, t],
  );

  usePasteImages({
    enabled: Boolean(
      config?.config.pasteUploadEnabled &&
        config.viewer.hasAccess &&
        !config.viewer.banned,
    ),
    onFiles: addFiles,
  });

  const upload = async () => {
    if (files.length === 0) return;
    const batch = [...files];
    setUploading(true);
    setProgress({ completed: 0, total: batch.length });
    try {
      const results = await mapConcurrent(
        batch,
        config?.config.uploadConcurrency ?? 3,
        async (file) => {
          const form = new FormData();
          form.set("file", file);
          return apiFetch<UploadResponse>("/api/images", {
            method: "POST",
            body: form,
          });
        },
        (completed, total) => setProgress({ completed, total }),
      );
      const uploaded = results.flatMap((result) =>
        result.status === "fulfilled" ? [result.value.image] : [],
      );
      const failedFiles = batch.filter(
        (_file, index) => results[index]?.status === "rejected",
      );
      if (uploaded.length > 0) {
        setHistory((current) => {
          const next = mergeHistory(current, uploaded);
          const limited = next.slice(0, config?.config.historyLimit ?? 100);
          saveHistory(limited, config?.config.historyLimit);
          return limited;
        });
      }
      setFiles(failedFiles);
      if (failedFiles.length === 0) {
        setMessage({
          severity: "success",
          text: t("batchUploadSuccess", { count: uploaded.length }),
        });
      } else if (uploaded.length > 0) {
        setMessage({
          severity: "warning",
          text: t("batchUploadPartial", {
            uploaded: uploaded.length,
            failed: failedFiles.length,
          }),
        });
      } else {
        const firstError = results.find(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected",
        );
        setMessage({
          severity: "error",
          text: firstError
            ? translateError(firstError.reason)
            : t("batchUploadFailed"),
        });
      }
      await loadConfig();
    } catch (error) {
      setMessage({
        severity: "error",
        text: translateError(error),
      });
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const unlock = async () => {
    setUnlocking(true);
    try {
      await apiFetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      setPassword("");
      await loadConfig();
    } catch (error) {
      setMessage({ severity: "error", text: translateError(error) });
    } finally {
      setUnlocking(false);
    }
  };

  const deleteImage = async () => {
    if (!deleting) return;
    try {
      await apiFetch(`/api/images/${encodeURIComponent(deleting.id)}`, {
        method: "DELETE",
        headers: { "X-Delete-Token": deleting.deleteToken },
      });
      const next = history.filter(({ id }) => id !== deleting.id);
      setHistory(next);
      saveHistory(next, config?.config.historyLimit);
      setDeleting(null);
      setMessage({ severity: "success", text: t("deleteSuccess") });
    } catch (error) {
      setMessage({ severity: "error", text: translateError(error) });
    }
  };

  return {
    config,
    history,
    files,
    uploading,
    progress,
    password,
    unlocking,
    deleting,
    message,
    warningText: translateNotice(config?.viewer.notice ?? null),
    setFiles,
    setPassword,
    setDeleting,
    setMessage,
    addFiles,
    upload,
    unlock,
    deleteImage,
  };
}
