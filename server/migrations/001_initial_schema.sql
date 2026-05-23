CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'ADMIN');
CREATE TYPE booking_status AS ENUM (
  'PENDING_PAYMENT',
  'PAID',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED'
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role user_role NOT NULL DEFAULT 'ADMIN',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE downloadable_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE downloadable_contents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text,
  category_id uuid NOT NULL REFERENCES downloadable_categories(id) ON DELETE RESTRICT,
  is_featured boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  introduction text,
  importance text,
  subject text,
  related_careers text,
  estimated_minutes integer NOT NULL DEFAULT 60,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT topics_estimated_minutes_positive CHECK (estimated_minutes > 0)
);

CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  level text,
  management_type text,
  address text,
  phone text,
  email text,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  map_url text,
  general_info text,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  dni text NOT NULL UNIQUE,
  phone text,
  address text NOT NULL,
  responsible_name text NOT NULL,
  responsible_contact text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
  status booking_status NOT NULL DEFAULT 'PENDING_PAYMENT',
  selected_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  total_topics integer NOT NULL DEFAULT 0,
  total_amount numeric(12, 2) NOT NULL DEFAULT 0,
  payment_alias text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_total_topics_non_negative CHECK (total_topics >= 0),
  CONSTRAINT bookings_total_amount_non_negative CHECK (total_amount >= 0),
  CONSTRAINT bookings_time_order CHECK (end_time > start_time)
);

CREATE TABLE booking_topics (
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES topics(id) ON DELETE RESTRICT,
  PRIMARY KEY (booking_id, topic_id)
);

CREATE TABLE app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  price_per_hour numeric(12, 2) NOT NULL DEFAULT 0,
  topics_per_hour integer NOT NULL DEFAULT 1,
  max_students_per_slot integer NOT NULL DEFAULT 1,
  mercado_pago_alias text,
  primary_color text NOT NULL DEFAULT '#0f766e',
  secondary_color text NOT NULL DEFAULT '#1e293b',
  accent_color text NOT NULL DEFAULT '#f59e0b',
  whatsapp_number text,
  site_title text NOT NULL DEFAULT 'aulaCiencias',
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_settings_price_per_hour_non_negative CHECK (price_per_hour >= 0),
  CONSTRAINT app_settings_topics_per_hour_positive CHECK (topics_per_hour > 0),
  CONSTRAINT app_settings_max_students_per_slot_positive CHECK (max_students_per_slot > 0)
);

CREATE INDEX downloadable_contents_category_id_idx ON downloadable_contents(category_id);
CREATE INDEX topics_is_visible_idx ON topics(is_visible);
CREATE INDEX schools_is_visible_idx ON schools(is_visible);
CREATE INDEX bookings_student_id_idx ON bookings(student_id);
CREATE INDEX bookings_selected_date_idx ON bookings(selected_date);
