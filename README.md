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

## Docker local

Con Docker Desktop abierto:

```bash
npm run docker:up
```

La app queda en `http://localhost:8080` y PostgreSQL queda expuesto en `localhost:5433`.
El contenedor de la app ejecuta migraciones y seed antes de iniciar.
Docker local usa `AUTH_COOKIE_SECURE=false` para que el login funcione sobre HTTP.

En Windows, tambien se puede ejecutar `iniciar-red-local.bat`. El archivo construye
la version actual, inicia Docker y muestra las direcciones que pueden abrir otros
dispositivos conectados a la misma red local.

Credenciales admin locales creadas por el seed de Docker:

- Email: `admin@aulaciencias.local`
- Password: `admin123456`

Para bajar los contenedores:

```bash
npm run docker:down
```

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

Credenciales admin locales por defecto si copias `.env.example` sin cambiarlas:

- Email: `admin@aulaciencias.local`
- Password: `admin123456`

En produccion conviene definir otro `SUPERADMIN_PASSWORD` antes de ejecutar el seed. Luego se puede cambiar desde `#/admin` > Seguridad.

## Autenticacion admin

La sesion administrativa usa JWT firmado en cookie `httpOnly`. El frontend consulta el estado con `GET /api/auth/me` usando cookies, sin guardar tokens en `localStorage`.

Endpoints:

- `POST /api/auth/login`: recibe `email` y `password`, valida con Zod, aplica rate limit y crea la cookie si el usuario esta activo.
- `POST /api/auth/logout`: elimina la cookie de sesion.
- `GET /api/auth/me`: devuelve el usuario autenticado sin `passwordHash`.
- `PATCH /api/auth/change-password`: requiere sesion, valida password actual y guarda bcrypt del nuevo password.
- `/api/admin/*`: requiere usuario autenticado con rol `SUPERADMIN` o `ADMIN`.

El enlace al panel solo se muestra en la navegacion cuando la sesion actual pertenece a un usuario administrador. Un usuario comun no ve el boton y el backend igualmente bloquea `/api/admin/*` con `403`.

## APIs de contenido

Lectura publica, solo elementos visibles:

- `GET /api/downloadables?categoryId=...&categorySlug=...`
- `GET /api/downloadables/recent`
- `GET /api/topics?subject=...`
- `GET /api/topics/:id`
- `GET /api/schools?level=...&managementType=...&search=...`
- `GET /api/schools/:id`
- `GET /api/availability?date=YYYY-MM-DD&startTime=HH:mm&topicIds=id1,id2`
- `POST /api/bookings`

Administracion protegida por cookie de sesion y rol `SUPERADMIN` o `ADMIN`:

- `GET /api/admin/downloadables`
- `GET /api/admin/downloadables/:id`
- `POST /api/admin/downloadables`
- `PATCH /api/admin/downloadables/:id`
- `DELETE /api/admin/downloadables/:id`
- `GET /api/admin/topics`
- `GET /api/admin/topics/:id`
- `POST /api/admin/topics`
- `PATCH /api/admin/topics/:id`
- `DELETE /api/admin/topics/:id`
- `GET /api/admin/schools`
- `GET /api/admin/schools/:id`
- `POST /api/admin/schools`
- `PATCH /api/admin/schools/:id`
- `DELETE /api/admin/schools/:id`
- `GET /api/admin/bookings`
- `GET /api/admin/bookings/:id`
- `PATCH /api/admin/bookings/:id/status`

Los `DELETE` administrativos ocultan el registro con `isVisible=false` por defecto.

## Reservas

El flujo "Te lo explica Silvi" usa los temarios visibles, calcula duracion y precio desde `app_settings` y crea reservas publicas en estado `PENDING_PAYMENT`.

Reglas aplicadas:

- `topicsPerHour` define cuantos temarios entran por hora.
- `pricePerHour` define el monto por hora.
- `maxStudentsPerSlot` define el cupo maximo del horario.
- No se aceptan horarios pasados.
- No se aceptan reservas que superen el cupo.
- El pago queda como confirmacion manual del administrador.

La respuesta de `POST /api/bookings` incluye instrucciones para transferir al `mercadoPagoAlias` configurado y enviar WhatsApp al numero de `app_settings.whatsappNumber`; si no esta configurado, se usa `3446643467`.

## Render

- Build Command: `npm install && npm run build`
- Start Command: `npm start`
- Environment: definir `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `SUPERADMIN_EMAIL` y `SUPERADMIN_PASSWORD`; Render asigna `PORT`.
