CREATE TABLE IF NOT EXISTS glossary_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  short_description text,
  icon text,
  image_url text,
  theme_color text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS glossary_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES glossary_topics(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  full_definition text,
  introduction text,
  body text,
  examples text,
  counter_examples text,
  common_mistakes text,
  applications text,
  related_concepts text,
  conclusion text,
  seo_title text,
  seo_description text,
  keywords text,
  og_image_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS glossary_article_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES glossary_articles(id) ON DELETE CASCADE,
  level_name text NOT NULL,
  level_order integer NOT NULL DEFAULT 0,
  content text NOT NULL,
  examples text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS glossary_article_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES glossary_articles(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text,
  description text,
  url text,
  alt_text text,
  data_json jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS glossary_article_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES glossary_articles(id) ON DELETE CASCADE,
  title text NOT NULL,
  author text,
  institution text,
  url text,
  source_type text,
  access_date date,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS glossary_article_related_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES glossary_articles(id) ON DELETE CASCADE,
  related_article_id uuid NOT NULL REFERENCES glossary_articles(id) ON DELETE CASCADE,
  relation_label text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS source_name text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS last_verified_at date;

CREATE TABLE IF NOT EXISTS institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'otro',
  description text,
  address text,
  city text NOT NULL DEFAULT 'Gualeguaychú',
  phone text,
  email text,
  website text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  source_name text,
  source_url text,
  last_verified_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS academic_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  academic_level text NOT NULL,
  title_granted text,
  duration text,
  modality text,
  description text,
  requirements text,
  website text,
  source_name text,
  source_url text,
  last_verified_at date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS program_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id uuid NOT NULL REFERENCES academic_programs(id) ON DELETE CASCADE,
  name text NOT NULL,
  normalized_name text NOT NULL,
  year_or_stage text,
  is_required boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS study_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS program_study_areas (
  program_id uuid NOT NULL REFERENCES academic_programs(id) ON DELETE CASCADE,
  study_area_id uuid NOT NULL REFERENCES study_areas(id) ON DELETE CASCADE,
  PRIMARY KEY (program_id, study_area_id)
);

CREATE INDEX IF NOT EXISTS glossary_topics_active_order_idx ON glossary_topics(is_active, display_order);
CREATE INDEX IF NOT EXISTS glossary_articles_topic_idx ON glossary_articles(topic_id);
CREATE INDEX IF NOT EXISTS academic_programs_level_idx ON academic_programs(academic_level);
CREATE INDEX IF NOT EXISTS academic_programs_name_idx ON academic_programs(name);
CREATE INDEX IF NOT EXISTS program_topics_normalized_name_idx ON program_topics(normalized_name);
