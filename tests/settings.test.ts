import { describe, expect, it } from "vitest";
import { settingsForAdmin } from "@/lib/admin-settings";
import { settingsForClient } from "@/lib/settings";
import type { AppSettings } from "@/lib/types";

const settings: AppSettings = {
  siteName: "Example",
  uploadTitle: "Share",
  uploadDescription: "Temporary files",
  siteFooter: "Hosted at the edge",
  showRecentUploads: true,
  pasteUploadEnabled: true,
  maxBatchSize: 12,
  uploadConcurrency: 4,
  historyLimit: 36,
  allowUploaderDelete: false,
  showExpiryTime: true,
  showViewCount: false,
  accessMode: "password",
  accessPasswordHash: "private-hash",
  retentionDays: 14,
  warningBanThreshold: 2,
  autoBanHours: 48,
  uploadLimitPerHour: 25,
  violationAction: "delete_warn",
  aiModerationEnabled: true,
  aiFailMode: "block",
  aiModel: "@cf/example/model",
  aiPolicy: "Reject unsafe content.",
  siteNotice: "Maintenance tonight.",
  auditLogDays: 60,
};

describe("settings projections", () => {
  it("exposes upload customization without exposing the password hash", () => {
    const client = settingsForClient(settings);

    expect(client).toMatchObject({
      maxBatchSize: 12,
      uploadConcurrency: 4,
      historyLimit: 36,
      allowUploaderDelete: false,
      showViewCount: false,
      siteFooter: "Hosted at the edge",
    });
    expect(client).not.toHaveProperty("accessPasswordHash");
  });

  it("reports password presence to administrators without returning the hash", () => {
    const admin = settingsForAdmin(settings);

    expect(admin.accessPasswordConfigured).toBe(true);
    expect(admin).not.toHaveProperty("accessPasswordHash");
  });
});
