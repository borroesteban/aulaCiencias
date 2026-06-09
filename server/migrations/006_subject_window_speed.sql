ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS subject_window_interval_seconds integer NOT NULL DEFAULT 5;

ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS subject_window_items text;

ALTER TABLE app_settings
  ADD CONSTRAINT app_settings_subject_window_interval_seconds_range
  CHECK (subject_window_interval_seconds BETWEEN 2 AND 20);
