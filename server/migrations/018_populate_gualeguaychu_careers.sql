UPDATE academic_programs
SET academic_level = 'Abogacía', updated_at = NOW()
WHERE name = 'Abogacía'
  AND academic_level = 'grado';

DO $$
DECLARE
  v_institution_id uuid;
  v_program_id uuid;
BEGIN
  WITH updated AS (
    UPDATE institutions
    SET
      type = 'universidad',
      description = 'Sede Gualeguaychú de la Facultad de Ciencia y Tecnología de la Universidad Autónoma de Entre Ríos.',
      address = 'Blvr. Montana y Nogoyá',
      city = 'Gualeguaychú',
      phone = '(0343) 4975141 / 4975066',
      email = 'fcyt_gualeguaychu@uader.edu.ar',
      website = 'https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/',
      source_name = 'UADER FCyT - Sede Gualeguaychú',
      source_url = 'https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/',
      last_verified_at = '2026-06-16',
      is_active = true,
      updated_at = NOW()
    WHERE name = 'UADER FCyT - Sede Gualeguaychú'
    RETURNING id
  ),
  inserted AS (
    INSERT INTO institutions (
      name, type, description, address, city, phone, email, website,
      source_name, source_url, last_verified_at, is_active
    )
    SELECT
      'UADER FCyT - Sede Gualeguaychú',
      'universidad',
      'Sede Gualeguaychú de la Facultad de Ciencia y Tecnología de la Universidad Autónoma de Entre Ríos.',
      'Blvr. Montana y Nogoyá',
      'Gualeguaychú',
      '(0343) 4975141 / 4975066',
      'fcyt_gualeguaychu@uader.edu.ar',
      'https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/',
      'UADER FCyT - Sede Gualeguaychú',
      'https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/',
      '2026-06-16',
      true
    WHERE NOT EXISTS (SELECT 1 FROM updated)
    RETURNING id
  )
  SELECT id INTO v_institution_id FROM (
    SELECT id FROM updated
    UNION ALL
    SELECT id FROM inserted
  ) ids LIMIT 1;

  WITH updated AS (
    UPDATE academic_programs
    SET
      academic_level = 'Tecnicatura',
      title_granted = 'Técnico/a Universitario/a en Gestión Ambiental',
      duration = '3 años',
      modality = 'presencial',
      description = 'Carrera orientada a problemáticas ambientales, territorio, gestión y ciencias naturales.',
      website = 'https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/',
      source_name = 'UADER FCyT - Sede Gualeguaychú',
      source_url = 'https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/',
      last_verified_at = '2026-06-16',
      is_active = true,
      updated_at = NOW()
    WHERE institution_id = v_institution_id
      AND name = 'Tecnicatura Universitaria en Gestión Ambiental'
    RETURNING id
  ),
  inserted AS (
    INSERT INTO academic_programs (
      institution_id, name, academic_level, title_granted, duration, modality,
      description, website, source_name, source_url, last_verified_at, is_active
    )
    SELECT
      v_institution_id,
      'Tecnicatura Universitaria en Gestión Ambiental',
      'Tecnicatura',
      'Técnico/a Universitario/a en Gestión Ambiental',
      '3 años',
      'presencial',
      'Carrera orientada a problemáticas ambientales, territorio, gestión y ciencias naturales.',
      'https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/',
      'UADER FCyT - Sede Gualeguaychú',
      'https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/',
      '2026-06-16',
      true
    WHERE NOT EXISTS (SELECT 1 FROM updated)
    RETURNING id
  )
  SELECT id INTO v_program_id FROM (
    SELECT id FROM updated
    UNION ALL
    SELECT id FROM inserted
  ) ids LIMIT 1;
  DELETE FROM program_topics WHERE program_id = v_program_id;
  INSERT INTO program_topics (program_id, name, normalized_name, display_order) VALUES
    (v_program_id, 'Biología', 'biologia', 1),
    (v_program_id, 'Química', 'quimica', 2),
    (v_program_id, 'Geografía', 'geografia', 3),
    (v_program_id, 'Estadística', 'estadistica', 4);

  WITH updated AS (
    UPDATE academic_programs
    SET
      academic_level = 'Licenciatura',
      title_granted = 'Licenciado/a en Gestión Ambiental',
      duration = '4 años',
      modality = 'presencial',
      description = 'Formación de grado en gestión ambiental con base científica y territorial.',
      website = 'https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/',
      source_name = 'UADER FCyT - Sede Gualeguaychú',
      source_url = 'https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/',
      last_verified_at = '2026-06-16',
      is_active = true,
      updated_at = NOW()
    WHERE institution_id = v_institution_id
      AND name = 'Licenciatura en Gestión Ambiental'
    RETURNING id
  ),
  inserted AS (
    INSERT INTO academic_programs (
      institution_id, name, academic_level, title_granted, duration, modality,
      description, website, source_name, source_url, last_verified_at, is_active
    )
    SELECT
      v_institution_id,
      'Licenciatura en Gestión Ambiental',
      'Licenciatura',
      'Licenciado/a en Gestión Ambiental',
      '4 años',
      'presencial',
      'Formación de grado en gestión ambiental con base científica y territorial.',
      'https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/',
      'UADER FCyT - Sede Gualeguaychú',
      'https://fcyt.uader.edu.ar/sede-y-extension-aul/gualeguaychu/',
      '2026-06-16',
      true
    WHERE NOT EXISTS (SELECT 1 FROM updated)
    RETURNING id
  )
  SELECT id INTO v_program_id FROM (
    SELECT id FROM updated
    UNION ALL
    SELECT id FROM inserted
  ) ids LIMIT 1;
  DELETE FROM program_topics WHERE program_id = v_program_id;
  INSERT INTO program_topics (program_id, name, normalized_name, display_order) VALUES
    (v_program_id, 'Biología', 'biologia', 1),
    (v_program_id, 'Química', 'quimica', 2),
    (v_program_id, 'Geografía', 'geografia', 3),
    (v_program_id, 'Estadística', 'estadistica', 4);

  WITH updated AS (
    UPDATE institutions
    SET
      type = 'universidad',
      description = 'Facultad de la Universidad Nacional de Entre Ríos con sede en Gualeguaychú.',
      address = '25 de Mayo 709 / Pte. Perón 1154',
      city = 'Gualeguaychú',
      phone = '(03446) 426115 / 426203 / 426345 / 426148',
      email = 'soporte.fb@uner.edu.ar',
      website = 'https://www.fb.uner.edu.ar/carreras-3/',
      source_name = 'UNER Facultad de Bromatología - Carreras',
      source_url = 'https://www.fb.uner.edu.ar/carreras-3/',
      last_verified_at = '2026-06-16',
      is_active = true,
      updated_at = NOW()
    WHERE name = 'UNER - Facultad de Bromatología'
    RETURNING id
  ),
  inserted AS (
    INSERT INTO institutions (
      name, type, description, address, city, phone, email, website,
      source_name, source_url, last_verified_at, is_active
    )
    SELECT
      'UNER - Facultad de Bromatología',
      'universidad',
      'Facultad de la Universidad Nacional de Entre Ríos con sede en Gualeguaychú.',
      '25 de Mayo 709 / Pte. Perón 1154',
      'Gualeguaychú',
      '(03446) 426115 / 426203 / 426345 / 426148',
      'soporte.fb@uner.edu.ar',
      'https://www.fb.uner.edu.ar/carreras-3/',
      'UNER Facultad de Bromatología - Carreras',
      'https://www.fb.uner.edu.ar/carreras-3/',
      '2026-06-16',
      true
    WHERE NOT EXISTS (SELECT 1 FROM updated)
    RETURNING id
  )
  SELECT id INTO v_institution_id FROM (
    SELECT id FROM updated
    UNION ALL
    SELECT id FROM inserted
  ) ids LIMIT 1;

  FOR v_program_id IN
    WITH programs(name, academic_level, title_granted, modality, description, topic_names, topic_keys) AS (
      VALUES
        ('Tecnicatura Universitaria en Química', 'Tecnicatura', 'Técnico/a Universitario/a en Química', 'presencial', 'Carrera de pregrado de la Facultad de Bromatología orientada a química aplicada y laboratorio.', ARRAY['Química','Laboratorio','Matemática'], ARRAY['quimica','laboratorio','matematica']),
        ('Tecnicatura en Control Bromatológico', 'Tecnicatura', 'Técnico/a en Control Bromatológico', 'a distancia', 'Carrera de pregrado orientada al control bromatológico de alimentos.', ARRAY['Química','Biología','Laboratorio'], ARRAY['quimica','biologia','laboratorio']),
        ('Licenciatura en Bromatología', 'Licenciatura', 'Licenciado/a en Bromatología', 'presencial', 'Carrera universitaria centrada en alimentos, análisis bromatológico y salud pública.', ARRAY['Química','Biología','Laboratorio','Estadística'], ARRAY['quimica','biologia','laboratorio','estadistica']),
        ('Licenciatura en Nutrición', 'Licenciatura', 'Licenciado/a en Nutrición', 'presencial', 'Formación universitaria en nutrición, alimentación, salud y ciencias biológicas.', ARRAY['Biología','Química','Estadística'], ARRAY['biologia','quimica','estadistica']),
        ('Farmacia', 'Farmacia', 'Farmacéutico/a', 'presencial', 'Carrera universitaria de farmacia con base en química, biología y ciencias de la salud.', ARRAY['Química','Biología','Laboratorio'], ARRAY['quimica','biologia','laboratorio']),
        ('Bioquímica', 'Bioquímica', 'Bioquímico/a', 'presencial', 'Carrera universitaria orientada al análisis bioquímico, laboratorio y ciencias biomédicas.', ARRAY['Biología','Química','Laboratorio'], ARRAY['biologia','quimica','laboratorio']),
        ('Medicina Veterinaria', 'Medicina Veterinaria', 'Médico/a Veterinario/a', 'presencial', 'Carrera universitaria de ciencias veterinarias disponible en la Facultad de Bromatología.', ARRAY['Biología','Química'], ARRAY['biologia','quimica'])
    ),
    upserted AS (
      INSERT INTO academic_programs (
        institution_id, name, academic_level, title_granted, modality, description,
        website, source_name, source_url, last_verified_at, is_active
      )
      SELECT
        v_institution_id,
        p.name,
        p.academic_level,
        p.title_granted,
        p.modality,
        p.description,
        'https://www.fb.uner.edu.ar/carreras-3/',
        'UNER Facultad de Bromatología - Carreras',
        'https://www.fb.uner.edu.ar/carreras-3/',
        '2026-06-16',
        true
      FROM programs p
      WHERE NOT EXISTS (
        SELECT 1 FROM academic_programs ap
        WHERE ap.institution_id = v_institution_id
          AND ap.name = p.name
      )
      RETURNING id
    ),
    updated AS (
      UPDATE academic_programs ap
      SET
        academic_level = p.academic_level,
        title_granted = p.title_granted,
        modality = p.modality,
        description = p.description,
        website = 'https://www.fb.uner.edu.ar/carreras-3/',
        source_name = 'UNER Facultad de Bromatología - Carreras',
        source_url = 'https://www.fb.uner.edu.ar/carreras-3/',
        last_verified_at = '2026-06-16',
        is_active = true,
        updated_at = NOW()
      FROM programs p
      WHERE ap.institution_id = v_institution_id
        AND ap.name = p.name
      RETURNING ap.id
    )
    SELECT id FROM updated
    UNION
    SELECT id FROM upserted
  LOOP
    DELETE FROM program_topics WHERE program_id = v_program_id;
  END LOOP;

  INSERT INTO program_topics (program_id, name, normalized_name, display_order)
  SELECT ap.id, topic.name, topic.key, topic.ordinality
  FROM academic_programs ap
  JOIN (
    VALUES
      ('Tecnicatura Universitaria en Química', 'Química', 'quimica', 1),
      ('Tecnicatura Universitaria en Química', 'Laboratorio', 'laboratorio', 2),
      ('Tecnicatura Universitaria en Química', 'Matemática', 'matematica', 3),
      ('Tecnicatura en Control Bromatológico', 'Química', 'quimica', 1),
      ('Tecnicatura en Control Bromatológico', 'Biología', 'biologia', 2),
      ('Tecnicatura en Control Bromatológico', 'Laboratorio', 'laboratorio', 3),
      ('Licenciatura en Bromatología', 'Química', 'quimica', 1),
      ('Licenciatura en Bromatología', 'Biología', 'biologia', 2),
      ('Licenciatura en Bromatología', 'Laboratorio', 'laboratorio', 3),
      ('Licenciatura en Bromatología', 'Estadística', 'estadistica', 4),
      ('Licenciatura en Nutrición', 'Biología', 'biologia', 1),
      ('Licenciatura en Nutrición', 'Química', 'quimica', 2),
      ('Licenciatura en Nutrición', 'Estadística', 'estadistica', 3),
      ('Farmacia', 'Química', 'quimica', 1),
      ('Farmacia', 'Biología', 'biologia', 2),
      ('Farmacia', 'Laboratorio', 'laboratorio', 3),
      ('Bioquímica', 'Biología', 'biologia', 1),
      ('Bioquímica', 'Química', 'quimica', 2),
      ('Bioquímica', 'Laboratorio', 'laboratorio', 3),
      ('Medicina Veterinaria', 'Biología', 'biologia', 1),
      ('Medicina Veterinaria', 'Química', 'quimica', 2)
  ) AS topic(program_name, name, key, ordinality)
    ON topic.program_name = ap.name
  WHERE ap.institution_id = v_institution_id;

  WITH updated AS (
    UPDATE institutions
    SET
      type = 'universidad',
      description = 'Centro Regional Gualeguaychú de la Universidad de Concepción del Uruguay.',
      address = '25 de Mayo 1312',
      city = 'Gualeguaychú',
      phone = '03446-426852',
      email = 'recepciongchu@ucu.edu.ar',
      website = 'https://ucu.edu.ar/carreras/',
      source_name = 'UCU carreras e información institucional',
      source_url = 'https://ucu.edu.ar/carreras/',
      last_verified_at = '2026-06-16',
      is_active = true,
      updated_at = NOW()
    WHERE name = 'UCU - Centro Regional Gualeguaychú'
    RETURNING id
  ),
  inserted AS (
    INSERT INTO institutions (
      name, type, description, address, city, phone, email, website,
      source_name, source_url, last_verified_at, is_active
    )
    SELECT
      'UCU - Centro Regional Gualeguaychú',
      'universidad',
      'Centro Regional Gualeguaychú de la Universidad de Concepción del Uruguay.',
      '25 de Mayo 1312',
      'Gualeguaychú',
      '03446-426852',
      'recepciongchu@ucu.edu.ar',
      'https://ucu.edu.ar/carreras/',
      'UCU carreras e información institucional',
      'https://ucu.edu.ar/carreras/',
      '2026-06-16',
      true
    WHERE NOT EXISTS (SELECT 1 FROM updated)
    RETURNING id
  )
  SELECT id INTO v_institution_id FROM (
    SELECT id FROM updated
    UNION ALL
    SELECT id FROM inserted
  ) ids LIMIT 1;

  FOR v_program_id IN
    WITH programs(name, academic_level, title_granted, duration, modality, description) AS (
      VALUES
        ('Abogacía', 'Abogacía', 'Abogado/a', '5 años', 'presencial', 'Carrera universitaria del área jurídica disponible en el Centro Regional Gualeguaychú.'),
        ('Licenciatura en Comercio Internacional', 'Licenciatura', 'Licenciado/a en Comercio Internacional', '4 años', 'presencial', 'Formación en comercio, economía, gestión y relaciones internacionales.'),
        ('Licenciatura en Comercialización y Gestión de Negocios', 'Licenciatura', 'Licenciado/a en Comercialización y Gestión de Negocios', '4 años', 'presencial', 'Formación en negocios, marketing, gestión y análisis comercial.'),
        ('Profesorado Universitario de Educación Física', 'Profesorado', 'Profesor/a Universitario/a de Educación Física', '4 años', 'presencial', 'Profesorado universitario orientado a educación física y ciencias del movimiento.')
    ),
    upserted AS (
      INSERT INTO academic_programs (
        institution_id, name, academic_level, title_granted, duration, modality, description,
        website, source_name, source_url, last_verified_at, is_active
      )
      SELECT
        v_institution_id,
        p.name,
        p.academic_level,
        p.title_granted,
        p.duration,
        p.modality,
        p.description,
        'https://ucu.edu.ar/carreras/',
        'UCU carreras e información institucional',
        'https://ucu.edu.ar/carreras/',
        '2026-06-16',
        true
      FROM programs p
      WHERE NOT EXISTS (
        SELECT 1 FROM academic_programs ap
        WHERE ap.institution_id = v_institution_id
          AND ap.name = p.name
      )
      RETURNING id
    ),
    updated AS (
      UPDATE academic_programs ap
      SET
        academic_level = p.academic_level,
        title_granted = p.title_granted,
        duration = p.duration,
        modality = p.modality,
        description = p.description,
        website = 'https://ucu.edu.ar/carreras/',
        source_name = 'UCU carreras e información institucional',
        source_url = 'https://ucu.edu.ar/carreras/',
        last_verified_at = '2026-06-16',
        is_active = true,
        updated_at = NOW()
      FROM programs p
      WHERE ap.institution_id = v_institution_id
        AND ap.name = p.name
      RETURNING ap.id
    )
    SELECT id FROM updated
    UNION
    SELECT id FROM upserted
  LOOP
    DELETE FROM program_topics WHERE program_id = v_program_id;
  END LOOP;

  INSERT INTO program_topics (program_id, name, normalized_name, display_order)
  SELECT ap.id, topic.name, topic.key, topic.ordinality
  FROM academic_programs ap
  JOIN (
    VALUES
      ('Abogacía', 'Historia', 'historia', 1),
      ('Abogacía', 'Lectura comprensiva', 'lectura-comprensiva', 2),
      ('Licenciatura en Comercio Internacional', 'Matemática', 'matematica', 1),
      ('Licenciatura en Comercio Internacional', 'Estadística', 'estadistica', 2),
      ('Licenciatura en Comercialización y Gestión de Negocios', 'Matemática', 'matematica', 1),
      ('Licenciatura en Comercialización y Gestión de Negocios', 'Estadística', 'estadistica', 2),
      ('Profesorado Universitario de Educación Física', 'Biología', 'biologia', 1)
  ) AS topic(program_name, name, key, ordinality)
    ON topic.program_name = ap.name
  WHERE ap.institution_id = v_institution_id;

  UPDATE academic_programs
  SET academic_level = 'Abogacía', updated_at = NOW()
  WHERE name = 'Abogacía';

  UPDATE academic_programs
  SET academic_level = 'Licenciatura', updated_at = NOW()
  WHERE name IN ('Licenciatura en Comercio Internacional', 'Licenciatura en Comercialización y Gestión de Negocios');

  UPDATE academic_programs
  SET academic_level = 'Profesorado', updated_at = NOW()
  WHERE name = 'Profesorado Universitario de Educación Física';
END $$;
