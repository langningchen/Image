CREATE TABLE IF NOT EXISTS images (
  id TEXT PRIMARY KEY NOT NULL,
  object_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size > 0),
  created_at INTEGER NOT NULL,
  last_accessed_at INTEGER NOT NULL,
  expires_at INTEGER,
  view_count INTEGER NOT NULL DEFAULT 0,
  delete_token_hash TEXT NOT NULL,
  uploader_subject_id TEXT NOT NULL,
  storage_backend TEXT NOT NULL DEFAULT 'r2',
  storage_ref TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'skipped',
  moderation_reason TEXT,
  deletion_pending INTEGER NOT NULL DEFAULT 0 CHECK (deletion_pending >= 0)
);

CREATE INDEX IF NOT EXISTS images_expiry_idx
  ON images (deletion_pending, last_accessed_at);

CREATE INDEX IF NOT EXISTS images_fixed_expiry_idx
  ON images (deletion_pending, expires_at);

CREATE INDEX IF NOT EXISTS images_subject_idx
  ON images (uploader_subject_id, created_at DESC);

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY NOT NULL,
  ip_masked TEXT NOT NULL,
  warning_count INTEGER NOT NULL DEFAULT 0 CHECK (warning_count >= 0),
  notice_code TEXT,
  notice_params TEXT,
  notice_detail TEXT,
  permanent_ban INTEGER NOT NULL DEFAULT 0 CHECK (permanent_ban IN (0, 1)),
  banned_until INTEGER,
  ban_reason_code TEXT,
  ban_reason_detail TEXT,
  upload_window_started_at INTEGER,
  upload_count INTEGER NOT NULL DEFAULT 0 CHECK (upload_count >= 0),
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS subjects_activity_idx
  ON subjects (last_seen_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('site_name', 'VanishPic', unixepoch('subsec') * 1000),
  ('upload_title', 'Upload an image', unixepoch('subsec') * 1000),
  ('upload_description', '', unixepoch('subsec') * 1000),
  ('site_footer', '', unixepoch('subsec') * 1000),
  ('show_recent_uploads', 'true', unixepoch('subsec') * 1000),
  ('paste_upload_enabled', 'true', unixepoch('subsec') * 1000),
  ('max_batch_size', '20', unixepoch('subsec') * 1000),
  ('upload_concurrency', '3', unixepoch('subsec') * 1000),
  ('history_limit', '24', unixepoch('subsec') * 1000),
  ('allow_uploader_delete', 'true', unixepoch('subsec') * 1000),
  ('show_expiry_time', 'true', unixepoch('subsec') * 1000),
  ('show_view_count', 'true', unixepoch('subsec') * 1000),
  ('access_mode', 'public', unixepoch('subsec') * 1000),
  ('access_password_hash', '', unixepoch('subsec') * 1000),
  ('setup_completed', 'false', unixepoch('subsec') * 1000),
  ('storage_backend', 'r2', unixepoch('subsec') * 1000),
  ('github_owner', '', unixepoch('subsec') * 1000),
  ('github_repo', '', unixepoch('subsec') * 1000),
  ('github_branch', 'main', unixepoch('subsec') * 1000),
  ('github_pat_encrypted', '', unixepoch('subsec') * 1000),
  ('retention_days', '7', unixepoch('subsec') * 1000),
  ('warning_ban_threshold', '3', unixepoch('subsec') * 1000),
  ('auto_ban_hours', '168', unixepoch('subsec') * 1000),
  ('upload_limit_per_hour', '30', unixepoch('subsec') * 1000),
  ('violation_action', 'delete_warn', unixepoch('subsec') * 1000),
  ('ai_moderation_enabled', 'false', unixepoch('subsec') * 1000),
  ('ai_fail_mode', 'allow', unixepoch('subsec') * 1000),
  ('ai_model', '@cf/mistralai/mistral-small-3.1-24b-instruct', unixepoch('subsec') * 1000),
  ('ai_policy', 'Reject explicit sexual content or nudity, sexualized minors, graphic gore, credible violence, extremist propaganda, hateful imagery, illegal drug sales, and instructions or promotion of serious wrongdoing.', unixepoch('subsec') * 1000),
  ('site_notice', '', unixepoch('subsec') * 1000),
  ('audit_log_days', '90', unixepoch('subsec') * 1000);

CREATE TABLE IF NOT EXISTS moderation_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id TEXT,
  subject_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,
  reason TEXT,
  details TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS moderation_events_created_idx
  ON moderation_events (created_at DESC);

CREATE INDEX IF NOT EXISTS moderation_events_subject_idx
  ON moderation_events (subject_id, created_at DESC);

CREATE TABLE IF NOT EXISTS auth_attempts (
  subject_id TEXT NOT NULL,
  purpose TEXT NOT NULL,
  failure_count INTEGER NOT NULL DEFAULT 0,
  window_started_at INTEGER NOT NULL,
  blocked_until INTEGER,
  PRIMARY KEY (subject_id, purpose)
);
