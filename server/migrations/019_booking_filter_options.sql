CREATE TABLE IF NOT EXISTS booking_filter_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('level', 'year', 'track')),
  label text NOT NULL,
  parent_id uuid REFERENCES booking_filter_options(id) ON DELETE SET NULL,
  display_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO booking_filter_options (id, kind, label, parent_id, display_order, is_visible)
VALUES
  ('00000000-0000-0000-0000-000000000101', 'level', 'Preescolar', null, 10, true),
  ('00000000-0000-0000-0000-000000000102', 'level', 'Primaria', null, 20, true),
  ('00000000-0000-0000-0000-000000000103', 'level', 'Secundaria', null, 30, true),
  ('00000000-0000-0000-0000-000000000104', 'level', 'Terciaria', null, 40, true),
  ('00000000-0000-0000-0000-000000000105', 'level', 'Universitaria', null, 50, true),

  ('00000000-0000-0000-0000-000000000201', 'year', 'Sala de 3', '00000000-0000-0000-0000-000000000101', 10, true),
  ('00000000-0000-0000-0000-000000000202', 'year', 'Sala de 4', '00000000-0000-0000-0000-000000000101', 20, true),
  ('00000000-0000-0000-0000-000000000203', 'year', 'Sala de 5', '00000000-0000-0000-0000-000000000101', 30, true),

  ('00000000-0000-0000-0000-000000000211', 'year', '1° grado', '00000000-0000-0000-0000-000000000102', 10, true),
  ('00000000-0000-0000-0000-000000000212', 'year', '2° grado', '00000000-0000-0000-0000-000000000102', 20, true),
  ('00000000-0000-0000-0000-000000000213', 'year', '3° grado', '00000000-0000-0000-0000-000000000102', 30, true),
  ('00000000-0000-0000-0000-000000000214', 'year', '4° grado', '00000000-0000-0000-0000-000000000102', 40, true),
  ('00000000-0000-0000-0000-000000000215', 'year', '5° grado', '00000000-0000-0000-0000-000000000102', 50, true),
  ('00000000-0000-0000-0000-000000000216', 'year', '6° grado', '00000000-0000-0000-0000-000000000102', 60, true),

  ('00000000-0000-0000-0000-000000000221', 'year', '1° año', '00000000-0000-0000-0000-000000000103', 10, true),
  ('00000000-0000-0000-0000-000000000222', 'year', '2° año', '00000000-0000-0000-0000-000000000103', 20, true),
  ('00000000-0000-0000-0000-000000000223', 'year', '3° año', '00000000-0000-0000-0000-000000000103', 30, true),
  ('00000000-0000-0000-0000-000000000224', 'year', '4° año', '00000000-0000-0000-0000-000000000103', 40, true),
  ('00000000-0000-0000-0000-000000000225', 'year', '5° año', '00000000-0000-0000-0000-000000000103', 50, true),
  ('00000000-0000-0000-0000-000000000226', 'year', '6° año', '00000000-0000-0000-0000-000000000103', 60, true),

  ('00000000-0000-0000-0000-000000000231', 'year', '1° año', '00000000-0000-0000-0000-000000000104', 10, true),
  ('00000000-0000-0000-0000-000000000232', 'year', '2° año', '00000000-0000-0000-0000-000000000104', 20, true),
  ('00000000-0000-0000-0000-000000000233', 'year', '3° año', '00000000-0000-0000-0000-000000000104', 30, true),
  ('00000000-0000-0000-0000-000000000234', 'year', '4° año', '00000000-0000-0000-0000-000000000104', 40, true),

  ('00000000-0000-0000-0000-000000000241', 'year', '1° año', '00000000-0000-0000-0000-000000000105', 10, true),
  ('00000000-0000-0000-0000-000000000242', 'year', '2° año', '00000000-0000-0000-0000-000000000105', 20, true),
  ('00000000-0000-0000-0000-000000000243', 'year', '3° año', '00000000-0000-0000-0000-000000000105', 30, true),
  ('00000000-0000-0000-0000-000000000244', 'year', '4° año', '00000000-0000-0000-0000-000000000105', 40, true),
  ('00000000-0000-0000-0000-000000000245', 'year', '5° año', '00000000-0000-0000-0000-000000000105', 50, true),
  ('00000000-0000-0000-0000-000000000246', 'year', '6° año', '00000000-0000-0000-0000-000000000105', 60, true),

  ('00000000-0000-0000-0000-000000000301', 'track', 'Bachiller', '00000000-0000-0000-0000-000000000103', 10, true),
  ('00000000-0000-0000-0000-000000000302', 'track', 'Humanidades', '00000000-0000-0000-0000-000000000103', 20, true),
  ('00000000-0000-0000-0000-000000000303', 'track', 'Ciencias naturales', '00000000-0000-0000-0000-000000000103', 30, true),
  ('00000000-0000-0000-0000-000000000304', 'track', 'Economía y administración', '00000000-0000-0000-0000-000000000103', 40, true),
  ('00000000-0000-0000-0000-000000000305', 'track', 'Técnico', '00000000-0000-0000-0000-000000000103', 50, true),
  ('00000000-0000-0000-0000-000000000306', 'track', 'Computación', '00000000-0000-0000-0000-000000000103', 60, true),
  ('00000000-0000-0000-0000-000000000307', 'track', 'Electromecánica', '00000000-0000-0000-0000-000000000103', 70, true),
  ('00000000-0000-0000-0000-000000000308', 'track', 'Carpintería', '00000000-0000-0000-0000-000000000103', 80, true),
  ('00000000-0000-0000-0000-000000000309', 'track', 'Industria del vestir', '00000000-0000-0000-0000-000000000103', 90, true),
  ('00000000-0000-0000-0000-000000000310', 'track', 'Perito mercantil', '00000000-0000-0000-0000-000000000103', 100, true),
  ('00000000-0000-0000-0000-000000000311', 'track', 'Liceo militar', '00000000-0000-0000-0000-000000000103', 110, true),
  ('00000000-0000-0000-0000-000000000312', 'track', 'Liceo naval', '00000000-0000-0000-0000-000000000103', 120, true),

  ('00000000-0000-0000-0000-000000000321', 'track', 'Profesorado', '00000000-0000-0000-0000-000000000104', 10, true),
  ('00000000-0000-0000-0000-000000000322', 'track', 'Tecnicatura', '00000000-0000-0000-0000-000000000104', 20, true),
  ('00000000-0000-0000-0000-000000000323', 'track', 'Formación profesional', '00000000-0000-0000-0000-000000000104', 30, true),

  ('00000000-0000-0000-0000-000000000331', 'track', 'Pregrado', '00000000-0000-0000-0000-000000000105', 10, true),
  ('00000000-0000-0000-0000-000000000332', 'track', 'Grado', '00000000-0000-0000-0000-000000000105', 20, true),
  ('00000000-0000-0000-0000-000000000333', 'track', 'Posgrado', '00000000-0000-0000-0000-000000000105', 30, true)
ON CONFLICT (id) DO UPDATE
SET label = EXCLUDED.label,
    parent_id = EXCLUDED.parent_id,
    display_order = EXCLUDED.display_order,
    is_visible = EXCLUDED.is_visible,
    updated_at = now();

INSERT INTO subjects (name, slug, description, display_order, is_visible)
VALUES
  ('Matemática', 'matematica', 'Materia de apoyo disponible para reservas.', 10, true),
  ('Física', 'fisica', 'Materia de apoyo disponible para reservas.', 20, true),
  ('Química', 'quimica', 'Materia de apoyo disponible para reservas.', 30, true),
  ('Biología', 'biologia', 'Materia de apoyo disponible para reservas.', 40, true),
  ('Lengua', 'lengua', 'Materia de apoyo disponible para reservas.', 50, true),
  ('Inglés', 'ingles', 'Materia de apoyo disponible para reservas.', 60, true),
  ('Computación', 'computacion', 'Materia de apoyo disponible para reservas.', 70, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO topics (
  title,
  introduction,
  importance,
  subject,
  education_level,
  education_track,
  school_year,
  related_careers,
  estimated_minutes,
  is_visible
)
SELECT *
FROM (
  VALUES
    (
      'Consulta general de Matemática primaria',
      'Espacio base para solicitar apoyo de matemática en primaria.',
      'Permite reservar aunque el temario específico todavía no esté cargado.',
      'Matemática',
      'Primaria',
      null,
      '3° grado',
      'Docencia, ciencias, tecnología',
      60,
      true
    ),
    (
      'Lectoescritura inicial',
      'Espacio base para acompañamiento de lectura y escritura inicial.',
      'Permite reservar una clase inicial mientras se define el contenido exacto.',
      'Lengua',
      'Preescolar',
      null,
      'Sala de 5',
      'Docencia, comunicación',
      60,
      true
    ),
    (
      'Computación secundaria',
      'Espacio base para contenidos de computación del ciclo secundario.',
      'Permite solicitar apoyo en herramientas, lógica y conceptos informáticos.',
      'Computación',
      'Secundaria',
      'Computación',
      '3° año',
      'Informática, programación, tecnología',
      60,
      true
    ),
    (
      'Química para profesorado',
      'Espacio base para química de nivel terciario/profesorado.',
      'Permite reservar una clase de química aunque el programa detallado se complete después.',
      'Química',
      'Terciaria',
      'Profesorado',
      '4° año',
      'Profesorado, laboratorio, salud',
      60,
      true
    ),
    (
      'Matemática universitaria inicial',
      'Espacio base para matemática de ingreso o primeros años universitarios.',
      'Permite reservar apoyo universitario inicial.',
      'Matemática',
      'Universitaria',
      'Grado',
      '1° año',
      'Ingeniería, economía, ciencias',
      60,
      true
    ),
    (
      'Física universitaria inicial',
      'Espacio base para física de ingreso o primeros años universitarios.',
      'Permite reservar apoyo universitario inicial.',
      'Física',
      'Universitaria',
      'Grado',
      '1° año',
      'Ingeniería, ciencias, salud',
      60,
      true
    )
) AS placeholders (
  title,
  introduction,
  importance,
  subject,
  education_level,
  education_track,
  school_year,
  related_careers,
  estimated_minutes,
  is_visible
)
WHERE NOT EXISTS (
  SELECT 1
  FROM topics
  WHERE topics.title = placeholders.title
    AND topics.subject = placeholders.subject
);
