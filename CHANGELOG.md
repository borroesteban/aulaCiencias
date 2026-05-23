# Changelog

## 2026-05-23

- Se creo la base fullstack con backend Express, frontend React + Vite y build unificado para Render.
- Se agrego la capa PostgreSQL con modelos tipados, migracion inicial y seed de SUPERADMIN/configuracion.
- Se implemento autenticacion administrativa con bcrypt, JWT en cookie httpOnly, validacion Zod y rate limit de login.
- Se agregaron middlewares `requireAuth` y `requireRole` para proteger `/api/admin/*`.
- Se preparo el frontend para consultar la sesion con `GET /api/auth/me` sin usar `localStorage`.
