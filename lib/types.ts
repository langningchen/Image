export type AccessMode = "public" | "password";
export type AiFailMode = "allow" | "block";
export type StorageBackend = "r2" | "github";
export type ViolationAction = "delete" | "delete_warn";

export interface AppSettings {
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
  accessMode: AccessMode;
  accessPasswordHash: string;
  retentionDays: number;
  warningBanThreshold: number;
  autoBanHours: number;
  uploadLimitPerHour: number;
  violationAction: ViolationAction;
  aiModerationEnabled: boolean;
  aiFailMode: AiFailMode;
  aiModel: string;
  aiPolicy: string;
  siteNotice: string;
  auditLogDays: number;
}

export interface SubjectRecord {
  id: string;
  ip_masked: string;
  warning_count: number;
  notice_code: string | null;
  notice_params: string | null;
  notice_detail: string | null;
  permanent_ban: number;
  banned_until: number | null;
  ban_reason_code: string | null;
  ban_reason_detail: string | null;
  upload_window_started_at: number | null;
  upload_count: number;
  created_at: number;
  last_seen_at: number;
}

export interface ImageRecord {
  id: string;
  object_key: string;
  original_name: string;
  content_type: string;
  byte_size: number;
  created_at: number;
  last_accessed_at: number;
  expires_at: number | null;
  view_count: number;
  delete_token_hash: string;
  uploader_subject_id: string;
  storage_backend: StorageBackend;
  storage_ref: string | null;
  moderation_status: string;
  moderation_reason: string | null;
  deletion_pending: number;
}

export interface StorageConfig {
  setupCompleted: boolean;
  backend: StorageBackend;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubPatEncrypted: string;
}

export interface ModerationResult {
  status: "allowed" | "blocked" | "error" | "skipped";
  reason: string;
  categories: string[];
  confidence: number | null;
  raw?: string;
}
