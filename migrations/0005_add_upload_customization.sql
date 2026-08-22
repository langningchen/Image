INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('site_footer', '', unixepoch('subsec') * 1000),
  ('max_batch_size', '20', unixepoch('subsec') * 1000),
  ('upload_concurrency', '3', unixepoch('subsec') * 1000),
  ('history_limit', '24', unixepoch('subsec') * 1000),
  ('allow_uploader_delete', 'true', unixepoch('subsec') * 1000),
  ('show_expiry_time', 'true', unixepoch('subsec') * 1000),
  ('show_view_count', 'true', unixepoch('subsec') * 1000);
