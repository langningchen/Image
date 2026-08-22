UPDATE settings
SET
  value = '@cf/mistralai/mistral-small-3.1-24b-instruct',
  updated_at = unixepoch('subsec') * 1000
WHERE key = 'ai_model'
  AND value = '@cf/google/gemma-4-26b-a4b-it';
