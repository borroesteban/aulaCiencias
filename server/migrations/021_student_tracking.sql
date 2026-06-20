CREATE TABLE IF NOT EXISTS student_subject_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject text NOT NULL,
  progress_percent integer NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  status text,
  teacher_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_seen_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject text NOT NULL,
  topic text NOT NULL,
  seen_at timestamp with time zone NOT NULL DEFAULT now(),
  booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS student_pending_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject text NOT NULL,
  title text NOT NULL,
  description text,
  due_date timestamp with time zone,
  status text NOT NULL DEFAULT 'pendiente',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_teacher_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  subject text,
  note text NOT NULL,
  visible_to_family boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_download_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  downloadable_id uuid REFERENCES downloadable_contents(id) ON DELETE SET NULL,
  title text NOT NULL,
  downloaded_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_family_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL UNIQUE REFERENCES students(id) ON DELETE CASCADE,
  current_work text,
  needs_reinforcement text,
  general_status text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_subject_progress_student ON student_subject_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_seen_topics_student ON student_seen_topics(student_id);
CREATE INDEX IF NOT EXISTS idx_student_pending_exercises_student ON student_pending_exercises(student_id);
CREATE INDEX IF NOT EXISTS idx_student_teacher_notes_student ON student_teacher_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_download_events_student ON student_download_events(student_id);
