ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS booking_batch_id uuid,
  ADD COLUMN IF NOT EXISTS estado_reserva text NOT NULL DEFAULT 'pendiente_pago',
  ADD COLUMN IF NOT EXISTS estado_pago text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS mercadopago_preference_id text,
  ADD COLUMN IF NOT EXISTS mercadopago_payment_id text,
  ADD COLUMN IF NOT EXISTS google_calendar_event_id text,
  ADD COLUMN IF NOT EXISTS monto_senia numeric(12, 2),
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

CREATE TABLE IF NOT EXISTS booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_batch_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  provider text NOT NULL DEFAULT 'mercadopago',
  preference_id text,
  payment_id text,
  external_reference text,
  amount numeric(12, 2),
  raw_payload jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_booking_batch_id ON bookings(booking_batch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_estado_reserva_pago ON bookings(estado_reserva, estado_pago);
CREATE INDEX IF NOT EXISTS idx_booking_payments_batch ON booking_payments(booking_batch_id);
CREATE INDEX IF NOT EXISTS idx_booking_payments_payment_id ON booking_payments(payment_id);
