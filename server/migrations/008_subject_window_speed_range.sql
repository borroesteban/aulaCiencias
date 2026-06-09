ALTER TABLE app_settings
  DROP CONSTRAINT IF EXISTS app_settings_subject_window_interval_seconds_range;

ALTER TABLE app_settings
  ADD CONSTRAINT app_settings_subject_window_interval_seconds_range
  CHECK (subject_window_interval_seconds BETWEEN 1 AND 120);
