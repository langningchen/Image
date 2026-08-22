UPDATE settings
SET
  value = '@cf/google/gemma-4-26b-a4b-it',
  updated_at = unixepoch('subsec') * 1000
WHERE
  key = 'ai_model'
  AND value = '@cf/meta/llama-3.2-11b-vision-instruct';
