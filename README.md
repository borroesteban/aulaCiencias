# aulaCiencias

Reservas de turnos para una profesora particular.

## Estructura

- `server/`: API Node.js + Express con TypeScript.
- `server/migrations/`: migraciones SQL de PostgreSQL.
- `client/`: frontend React + Vite con TypeScript.
- `.env.example`: variables de entorno esperadas.

## Desarrollo local

```bash
npm install
npm run dev
```

El backend corre en `http://localhost:3000` y expone `GET /api/health`.
El frontend corre en `http://localhost:5173` con proxy a `/api`.

## Produccion

```bash
npm run build
npm start
```

En produccion, Express sirve el frontend compilado desde `client/dist`.

## Base de datos

La capa de datos usa PostgreSQL, Drizzle ORM para modelos tipados y migraciones SQL versionadas.

1. Crear una base PostgreSQL.
2. Copiar `.env.example` a `.env` y completar `DATABASE_URL`, `JWT_SECRET` y `SUPERADMIN_PASSWORD`.
3. Ejecutar:

```bash
npm run db:migrate
npm run db:seed
```

El seed crea o actualiza el usuario `SUPERADMIN` usando hash bcrypt y crea la configuracion inicial si todavia no existe.

## Autenticacion admin

La sesion administrativa usa JWT firmado en cookie `httpOnly`. El frontend consulta el estado con `GET /api/auth/me` usando cookies, sin guardar tokens en `localStorage`.

Endpoints:

- `POST /api/auth/login`: recibe `email` y `password`, valida con Zod, aplica rate limit y crea la cookie si el usuario esta activo.
- `POST /api/auth/logout`: elimina la cookie de sesion.
- `GET /api/auth/me`: devuelve el usuario autenticado sin `passwordHash`.
- `PATCH /api/auth/change-password`: requiere sesion, valida password actual y guarda bcrypt del nuevo password.
- `/api/admin/*`: requiere usuario autenticado con rol `SUPERADMIN` o `ADMIN`.

## Render

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: definir `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD`; Render asigna `PORT`.
