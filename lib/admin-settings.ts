import type { AppSettings } from "@/lib/types";

export function settingsForAdmin(settings: AppSettings) {
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
    accessPasswordConfigured: Boolean(settings.accessPasswordHash),
    retentionDays: settings.retentionDays,
    warningBanThreshold: settings.warningBanThreshold,
    autoBanHours: settings.autoBanHours,
    uploadLimitPerHour: settings.uploadLimitPerHour,
    violationAction: settings.violationAction,
    aiModerationEnabled: settings.aiModerationEnabled,
    aiFailMode: settings.aiFailMode,
    aiModel: settings.aiModel,
    aiPolicy: settings.aiPolicy,
    siteNotice: settings.siteNotice,
    auditLogDays: settings.auditLogDays,
  };
}
