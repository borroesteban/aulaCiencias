ALTER TABLE app_settings
  ADD COLUMN IF NOT EXISTS subject_window_rotation_seconds numeric(4, 1) NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS subject_window_pause_seconds numeric(4, 1) NOT NULL DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS subject_window_size_value numeric(6, 2) NOT NULL DEFAULT 140,
  ADD COLUMN IF NOT EXISTS subject_window_size_unit text NOT NULL DEFAULT 'px';

ALTER TABLE app_settings
  DROP CONSTRAINT IF EXISTS app_settings_subject_window_rotation_seconds_range,
  DROP CONSTRAINT IF EXISTS app_settings_subject_window_pause_seconds_range,
  DROP CONSTRAINT IF EXISTS app_settings_subject_window_size_value_range,
  DROP CONSTRAINT IF EXISTS app_settings_subject_window_size_unit_allowed;

UPDATE app_settings
SET
  subject_window_rotation_seconds = 1.0,
  subject_window_pause_seconds = 2.0
WHERE subject_window_rotation_seconds IS NULL
  OR subject_window_rotation_seconds IN (1.5, 3.0);

ALTER TABLE app_settings
  ADD CONSTRAINT app_settings_subject_window_rotation_seconds_range
  CHECK (subject_window_rotation_seconds BETWEEN 0.5 AND 20),
  ADD CONSTRAINT app_settings_subject_window_pause_seconds_range
  CHECK (subject_window_pause_seconds BETWEEN 0 AND 20),
  ADD CONSTRAINT app_settings_subject_window_size_value_range
  CHECK (subject_window_size_value BETWEEN 1 AND 500),
  ADD CONSTRAINT app_settings_subject_window_size_unit_allowed
  CHECK (subject_window_size_unit IN ('px', 'cm'));
