ALTER TABLE public.user_settings
  DROP COLUMN IF EXISTS airnow_api_key,
  DROP COLUMN IF EXISTS acled_api_key,
  DROP COLUMN IF EXISTS acled_email;