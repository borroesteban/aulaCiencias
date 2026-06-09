ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hero_image_url text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS background_image_url text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS favicon_url text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS carousel_images text;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hero_eyebrow text NOT NULL DEFAULT '';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hero_title text NOT NULL DEFAULT '';
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS hero_subtitle text NOT NULL DEFAULT '';
