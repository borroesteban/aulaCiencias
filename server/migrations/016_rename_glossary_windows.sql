UPDATE content_blocks
SET
  title = 'Ventanas de glosario',
  body = 'Materias y conceptos con definiciones breves, artículos completos y vínculos con profesiones reales.',
  updated_at = NOW()
WHERE key = 'home.subjectCarousel'
  AND title = 'Campos del conocimiento';
