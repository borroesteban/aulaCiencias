CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subjects_display_order_non_negative CHECK (display_order >= 0)
);

ALTER TABLE topics ADD COLUMN IF NOT EXISTS subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL;
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS subject_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  keywords text,
  definition text NOT NULL,
  professions text,
  jobs text,
  image_url text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subject_highlights_display_order_non_negative CHECK (display_order >= 0)
);

CREATE TABLE IF NOT EXISTS booking_time_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time time NOT NULL UNIQUE,
  label text NOT NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT booking_time_slots_display_order_non_negative CHECK (display_order >= 0)
);

CREATE TABLE IF NOT EXISTS guardians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text,
  dni text UNIQUE,
  phone text,
  email text,
  relationship text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_guardians (
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
  relationship text,
  is_primary boolean NOT NULL DEFAULT false,
  is_authorized boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, guardian_id)
);

CREATE TABLE IF NOT EXISTS content_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text,
  eyebrow text,
  body text,
  image_url text,
  metadata jsonb,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_blocks_display_order_non_negative CHECK (display_order >= 0)
);

INSERT INTO subjects (name, slug, display_order)
SELECT DISTINCT
  trimmed_subject,
  regexp_replace(lower(trimmed_subject), '[^a-z0-9]+', '-', 'g'),
  0
FROM (
  SELECT trim(subject) AS trimmed_subject
  FROM topics
  WHERE subject IS NOT NULL AND trim(subject) <> ''
) source
ON CONFLICT (slug) DO NOTHING;

UPDATE topics
SET subject_id = subjects.id
FROM subjects
WHERE topics.subject_id IS NULL
  AND topics.subject IS NOT NULL
  AND regexp_replace(lower(trim(topics.subject)), '[^a-z0-9]+', '-', 'g') = subjects.slug;

INSERT INTO guardians (first_name, phone, relationship)
SELECT DISTINCT
  trim(responsible_name),
  NULLIF(trim(responsible_contact), ''),
  'Responsable'
FROM students
WHERE responsible_name IS NOT NULL
  AND trim(responsible_name) <> ''
ON CONFLICT DO NOTHING;

INSERT INTO student_guardians (student_id, guardian_id, relationship, is_primary, is_authorized)
SELECT DISTINCT
  students.id,
  guardians.id,
  'Responsable',
  true,
  true
FROM students
INNER JOIN guardians
  ON guardians.first_name = trim(students.responsible_name)
  AND COALESCE(guardians.phone, '') = COALESCE(NULLIF(trim(students.responsible_contact), ''), '')
WHERE students.responsible_name IS NOT NULL
  AND trim(students.responsible_name) <> ''
ON CONFLICT (student_id, guardian_id) DO NOTHING;

INSERT INTO booking_time_slots (start_time, label, display_order)
VALUES
  ('08:00', '08:00', 10),
  ('09:00', '09:00', 20),
  ('10:00', '10:00', 30),
  ('11:00', '11:00', 40),
  ('14:00', '14:00', 50),
  ('15:00', '15:00', 60),
  ('16:00', '16:00', 70),
  ('17:00', '17:00', 80),
  ('18:00', '18:00', 90),
  ('19:00', '19:00', 100)
ON CONFLICT (start_time) DO NOTHING;

CREATE INDEX IF NOT EXISTS subjects_is_visible_idx ON subjects(is_visible);
CREATE INDEX IF NOT EXISTS subjects_display_order_idx ON subjects(display_order);
CREATE INDEX IF NOT EXISTS topics_subject_id_idx ON topics(subject_id);
CREATE INDEX IF NOT EXISTS subject_highlights_subject_id_idx ON subject_highlights(subject_id);
CREATE INDEX IF NOT EXISTS subject_highlights_is_visible_idx ON subject_highlights(is_visible);
CREATE INDEX IF NOT EXISTS subject_highlights_display_order_idx ON subject_highlights(display_order);
CREATE INDEX IF NOT EXISTS booking_time_slots_is_visible_idx ON booking_time_slots(is_visible);
CREATE INDEX IF NOT EXISTS booking_time_slots_display_order_idx ON booking_time_slots(display_order);
CREATE INDEX IF NOT EXISTS guardians_is_active_idx ON guardians(is_active);
CREATE INDEX IF NOT EXISTS guardians_phone_idx ON guardians(phone);
CREATE INDEX IF NOT EXISTS student_guardians_guardian_id_idx ON student_guardians(guardian_id);
CREATE INDEX IF NOT EXISTS content_blocks_key_idx ON content_blocks(key);
CREATE INDEX IF NOT EXISTS content_blocks_is_visible_idx ON content_blocks(is_visible);
