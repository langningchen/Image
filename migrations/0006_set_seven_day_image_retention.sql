UPDATE settings
SET value = '7',
    updated_at = unixepoch('subsec') * 1000
WHERE key = 'retention_days';
