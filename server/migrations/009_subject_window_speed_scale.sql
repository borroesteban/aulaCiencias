ALTER TABLE app_settings
  DROP CONSTRAINT IF EXISTS app_settings_subject_window_interval_seconds_range;

UPDATE app_settings
SET subject_window_interval_seconds = LEAST(50, GREATEST(1, subject_window_interval_seconds));

ALTER TABLE app_settings
  ADD CONSTRAINT app_settings_subject_window_interval_seconds_range
  CHECK (subject_window_interval_seconds BETWEEN 1 AND 50);
