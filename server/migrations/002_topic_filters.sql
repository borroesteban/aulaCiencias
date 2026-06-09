ALTER TABLE topics
  ADD COLUMN IF NOT EXISTS education_level text,
  ADD COLUMN IF NOT EXISTS education_track text,
  ADD COLUMN IF NOT EXISTS school_year text;

CREATE INDEX IF NOT EXISTS topics_education_level_idx ON topics(education_level);
CREATE INDEX IF NOT EXISTS topics_education_track_idx ON topics(education_track);
CREATE INDEX IF NOT EXISTS topics_school_year_idx ON topics(school_year);
