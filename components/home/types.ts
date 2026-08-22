export interface StructuredMessage {
  code: string;
  params?: Record<string, string | number | boolean | null>;
  detail?: string;
}

export interface PublicConfigResponse {
  ok: true;
  config: {
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
    retentionDays: number;
    siteNotice: string;
    aiModerationEnabled: boolean;
    demoMode: boolean;
    demoExpiryMinutes: number;
    setupCompleted: boolean;
    maxUploadMiB: number;
  };
  viewer: {
    hasAccess: boolean;
    warningCount: number;
    notice: StructuredMessage | null;
    banned: boolean;
    permanentBan: boolean;
    bannedUntil: number | null;
  };
}

export interface LocalImage {
  id: string;
  url: string;
  deleteToken: string;
  originalName: string;
  contentType: string;
  byteSize: number;
  createdAt: number;
  lastAccessedAt: number;
  expiresAt: number;
  viewCount?: number;
}

export interface UploadResponse {
  ok: true;
  image: LocalImage;
  warning: StructuredMessage | null;
}

export interface StatusResponse {
  ok: true;
  images: Array<Omit<LocalImage, "url" | "deleteToken">>;
}

export interface UploadProgress {
  completed: number;
  total: number;
}
