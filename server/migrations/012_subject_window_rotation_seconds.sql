ALTER TABLE app_settings
  DROP CONSTRAINT IF EXISTS app_settings_subject_window_interval_seconds_range;

UPDATE app_settings
SET subject_window_interval_seconds = CASE
  WHEN subject_window_interval_seconds = 5 THEN 3
  ELSE LEAST(20, GREATEST(1, subject_window_interval_seconds))
END;

ALTER TABLE app_settings
  ALTER COLUMN subject_window_interval_seconds SET DEFAULT 3;

ALTER TABLE app_settings
  ADD CONSTRAINT app_settings_subject_window_interval_seconds_range
  CHECK (subject_window_interval_seconds BETWEEN 1 AND 20);
