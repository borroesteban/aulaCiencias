UPDATE content_blocks
SET
  eyebrow = 'Orientación académica',
  title = 'Elegir qué estudiar',
  body = 'Carreras e instituciones de Gualeguaychú organizadas por nivel, intereses y fuentes verificables.',
  updated_at = NOW()
WHERE key = 'home.topics'
  AND title = 'Elegir qué aprender, sin vueltas';
