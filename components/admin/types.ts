export type AdminView =
  | "overview"
  | "settings"
  | "images"
  | "subjects"
  | "events";

export type SettingsSectionId =
  | "settings-general"
  | "settings-upload"
  | "settings-access"
  | "settings-lifecycle"
  | "settings-moderation"
  | "settings-storage";

export type SettingEditorId =
  | "siteName"
  | "uploadTitle"
  | "uploadDescription"
  | "siteNotice"
  | "siteFooter"
  | "showRecentUploads"
  | "pasteUploadEnabled"
  | "maxBatchSize"
  | "uploadConcurrency"
  | "historyLimit"
  | "allowUploaderDelete"
  | "showExpiryTime"
  | "showViewCount"
  | "accessMode"
  | "uploadLimitPerHour"
  | "retentionDays"
  | "violationAction"
  | "warningBanThreshold"
  | "autoBanHours"
  | "auditLogDays"
  | "aiModerationEnabled"
  | "aiFailMode"
  | "aiModel"
  | "aiPolicy"
  | "storage";

export type SubjectAction =
  | "warn"
  | "ban_temporary"
  | "ban_permanent"
  | "unban"
  | "reset_warnings";

export interface SiteSettings {
  siteName: string;
  uploadTitle: string;
  uploadDescription: string;
  siteFooter: string;
  showRecentUploads: boolean;
  pasteUploadEnabled: boolean;
  maxBatchSize: number;
  uploadConcurrency: number;
  historyLimit: number;
  allowUploaderDelete: boolean;
  showExpiryTime: boolean;
  showViewCount: boolean;
  accessMode: "public" | "password";
  accessPasswordConfigured: boolean;
  retentionDays: number;
  warningBanThreshold: number;
  autoBanHours: number;
  uploadLimitPerHour: number;
  violationAction: "delete" | "delete_warn";
  aiModerationEnabled: boolean;
  aiFailMode: "allow" | "block";
  aiModel: string;
  aiPolicy: string;
  siteNotice: string;
  auditLogDays: number;
}

export interface AdminImage {
  id: string;
  originalName: string;
  contentType: string;
  byteSize: number;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  viewCount: number;
  subjectId: string;
  ipMasked: string | null;
  moderationStatus: string;
  moderationReason: string | null;
  storageBackend: "r2" | "github";
}

export interface AdminSubject {
  id: string;
  ipMasked: string;
  warningCount: number;
  permanentBan: boolean;
  bannedUntil: number | null;
  banReason: { code: string; detail?: string } | null;
  createdAt: number;
  lastSeenAt: number;
  uploadCount: number;
}

export interface ModerationEvent {
  id: number;
  imageId: string | null;
  subjectId: string;
  eventType: string;
  actor: string;
  reason: string | null;
  details: string | null;
  createdAt: number;
}

export interface StorageSetup {
  backend: "r2" | "github";
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubPat: string;
}

export interface AdminOverview {
  ok: true;
  demoMode: boolean;
  stats: {
    images: number;
    subjects: number;
    banned: number;
    bytes: number;
  };
  setup: {
    setupCompleted: boolean;
    backend: "r2" | "github";
    githubOwner: string;
    githubRepo: string;
    githubBranch: string;
    githubPatConfigured: boolean;
  };
  settings: SiteSettings;
  images: AdminImage[];
  subjects: AdminSubject[];
  events: ModerationEvent[];
}

export interface SubjectActionTarget {
  id?: string;
  ip?: string;
  action: SubjectAction;
}
