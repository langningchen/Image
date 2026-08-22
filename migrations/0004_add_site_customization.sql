INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('site_name', 'VanishPic', unixepoch('subsec') * 1000),
  ('upload_title', 'Upload an image', unixepoch('subsec') * 1000),
  ('upload_description', '', unixepoch('subsec') * 1000),
  ('show_recent_uploads', 'true', unixepoch('subsec') * 1000),
  ('paste_upload_enabled', 'true', unixepoch('subsec') * 1000);
