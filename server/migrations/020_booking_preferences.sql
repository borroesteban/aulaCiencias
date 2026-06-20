ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS objetivos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS modalidad text NOT NULL DEFAULT 'virtual',
  ADD COLUMN IF NOT EXISTS tipo_clase text NOT NULL DEFAULT 'privada',
  ADD COLUMN IF NOT EXISTS usa_pack_promocional boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pack_seleccionado text,
  ADD COLUMN IF NOT EXISTS horarios_seleccionados jsonb NOT NULL DEFAULT '[]'::jsonb;
