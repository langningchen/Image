"use client";

import { useTranslations } from "next-intl";
import type { SettingListSection } from "@/components/admin/settings/settings-list-section";
import type { AdminOverview, SiteSettings } from "@/components/admin/types";

export function useSettingSections(
  settings: SiteSettings,
  setup: AdminOverview["setup"],
): SettingListSection[] {
  const t = useTranslations("Admin");
  const common = useTranslations("Common");
  const toggle = (enabled: boolean) =>
    enabled ? common("enabled") : common("disabled");

  return [
    {
      id: "settings-general",
      title: t("settingsGeneral"),
      description: t("settingsGeneralDescription"),
      entries: [
        {
          id: "siteName",
          label: t("siteName"),
          description: t("siteNameDescription"),
          summary: settings.siteName,
        },
        {
          id: "uploadTitle",
          label: t("uploadTitle"),
          description: t("uploadTitleDescription"),
          summary: settings.uploadTitle,
        },
        {
          id: "uploadDescription",
          label: t("uploadDescription"),
          description: t("uploadDescriptionHelp"),
          summary: settings.uploadDescription || common("notSet"),
        },
        {
          id: "siteNotice",
          label: t("siteNotice"),
          description: t("siteNoticeDescription"),
          summary: settings.siteNotice || common("notSet"),
        },
        {
          id: "siteFooter",
          label: t("siteFooter"),
          description: t("siteFooterDescription"),
          summary: settings.siteFooter || common("notSet"),
        },
      ],
    },
    {
      id: "settings-upload",
      title: t("settingsUpload"),
      description: t("settingsUploadDescription"),
      entries: [
        {
          id: "pasteUploadEnabled",
          label: t("pasteUploadEnabled"),
          description: t("pasteUploadDescription"),
          summary: toggle(settings.pasteUploadEnabled),
        },
        {
          id: "showRecentUploads",
          label: t("showRecentUploads"),
          description: t("showRecentUploadsDescription"),
          summary: toggle(settings.showRecentUploads),
        },
        {
          id: "maxBatchSize",
          label: t("maxBatchSize"),
          description: t("maxBatchSizeDescription"),
          summary: t("imageCount", { count: settings.maxBatchSize }),
        },
        {
          id: "uploadConcurrency",
          label: t("uploadConcurrency"),
          description: t("uploadConcurrencyDescription"),
          summary: t("concurrentUploadCount", {
            count: settings.uploadConcurrency,
          }),
        },
        {
          id: "historyLimit",
          label: t("historyLimit"),
          description: t("historyLimitDescription"),
          summary: t("imageCount", { count: settings.historyLimit }),
        },
        {
          id: "allowUploaderDelete",
          label: t("allowUploaderDelete"),
          description: t("allowUploaderDeleteDescription"),
          summary: toggle(settings.allowUploaderDelete),
        },
        {
          id: "showExpiryTime",
          label: t("showExpiryTime"),
          description: t("showExpiryTimeDescription"),
          summary: toggle(settings.showExpiryTime),
        },
        {
          id: "showViewCount",
          label: t("showViewCount"),
          description: t("showViewCountDescription"),
          summary: toggle(settings.showViewCount),
        },
      ],
    },
    {
      id: "settings-access",
      title: t("settingsAccess"),
      description: t("settingsAccessDescription"),
      entries: [
        {
          id: "accessMode",
          label: t("accessMode"),
          description: t("accessModeDescription"),
          summary:
            settings.accessMode === "public"
              ? t("publicAccess")
              : t("passwordAccess"),
        },
        {
          id: "uploadLimitPerHour",
          label: t("uploadLimit"),
          description: t("uploadLimitDescription"),
          summary: t("hourlyUploadCount", {
            count: settings.uploadLimitPerHour,
          }),
        },
      ],
    },
    {
      id: "settings-lifecycle",
      title: t("settingsLifecycle"),
      description: t("settingsLifecycleDescription"),
      entries: [
        {
          id: "violationAction",
          label: t("violationAction"),
          description: t("violationActionDescription"),
          summary:
            settings.violationAction === "delete"
              ? t("deleteOnly")
              : t("deleteAndWarn"),
        },
        {
          id: "warningBanThreshold",
          label: t("warningThreshold"),
          description: t("warningThresholdDescription"),
          summary:
            settings.warningBanThreshold === 0
              ? common("disabled")
              : t("warningCountSummary", {
                  count: settings.warningBanThreshold,
                }),
        },
        {
          id: "autoBanHours",
          label: t("autoBanHours"),
          description: t("autoBanHoursDescription"),
          summary:
            settings.autoBanHours === 0
              ? t("permanentlyBanned")
              : t("hourCount", { count: settings.autoBanHours }),
        },
        {
          id: "auditLogDays",
          label: t("auditLogDays"),
          description: t("auditLogDaysDescription"),
          summary: t("dayCount", { count: settings.auditLogDays }),
        },
      ],
    },
    {
      id: "settings-moderation",
      title: t("settingsModeration"),
      description: t("settingsModerationDescription"),
      entries: [
        {
          id: "aiModerationEnabled",
          label: t("aiModeration"),
          description: t("aiModerationDescription"),
          summary: toggle(settings.aiModerationEnabled),
        },
        {
          id: "aiFailMode",
          label: t("aiFailMode"),
          description: t("aiFailModeDescription"),
          summary:
            settings.aiFailMode === "allow"
              ? t("allowOnFailure")
              : t("blockOnFailure"),
        },
        {
          id: "aiModel",
          label: t("aiModel"),
          description: t("aiModelDescription"),
          summary: settings.aiModel,
        },
        {
          id: "aiPolicy",
          label: t("aiPolicy"),
          description: t("aiPolicyDescription"),
          summary: t("customPolicy"),
        },
      ],
    },
    {
      id: "settings-storage",
      title: t("settingsStorage"),
      description: t("settingsStorageDescription"),
      entries: [
        {
          id: "storage",
          label: t("storage"),
          description: t("storageDescription"),
          summary:
            setup.backend === "r2"
              ? t("r2Short")
              : `${setup.githubOwner}/${setup.githubRepo}`,
        },
      ],
    },
  ];
}
