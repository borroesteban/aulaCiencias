ALTER TABLE bookings
  ALTER COLUMN estado_reserva SET DEFAULT 'reserva_pendiente';

UPDATE bookings
SET estado_reserva = 'reserva_pendiente'
WHERE estado_reserva = 'pendiente_pago'
  AND status = 'PENDING_PAYMENT'
  AND expires_at > NOW();
