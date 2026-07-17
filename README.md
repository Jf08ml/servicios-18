# Mis Escorts — Perfiles verificados y citas seguras

Plataforma web (responsive/PWA-ready) de **seguridad, confianza y gestión** para
trabajadores independientes de servicios para adultos y sus clientes. La
plataforma **no comercializa el servicio**: ofrece herramientas para reducir
fraudes, organizar la agenda y reservar hoteles aliados.

## Funcionalidades del MVP

| Módulo | Descripción |
| --- | --- |
| Registro y login | Cuentas por rol (Profesional, Cliente, Hotel, Admin) con control de mayoría de edad (18+) y sesiones en base de datos |
| Verificación de identidad | Subida de documento + selfie, revisión manual por el equipo admin, verificación premium opcional |
| Perfiles profesionales | Perfil con alias, foto, bio, ciudad, idiomas y modo privacidad; directorio solo de perfiles verificados (premium primero) |
| Chat interno | Mensajería 1:1 dentro de la plataforma (polling), contadores de no leídos, sin exponer teléfonos |
| Agenda | Disponibilidad semanal del profesional, solicitud de citas por el cliente, confirmación/cancelación/completada/no asistió |
| Hoteles aliados | Catálogo de hoteles con habitaciones por bloques de horas, reserva con código de confirmación, vinculación a citas, comisión configurable |
| Calificaciones | Reseñas mutuas (1–5 ★) tras citas completadas; promedio visible en el perfil |
| Reportes | Reportes por categoría (perfil falso, estafa, acoso, seguridad) gestionados por el admin |
| Botón SOS | Alerta de emergencia con geolocalización y contactos de emergencia, monitoreada desde el panel admin |
| Panel admin | Verificaciones, reportes, alertas SOS, gestión de usuarios (suspender/bloquear/premium) y de hoteles |
| Panel hotel | Reservas próximas e históricas, check-in, ingresos y comisión del mes |

## Stack

- **Next.js 15** (App Router, Server Actions) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **PostgreSQL** + **Prisma ORM**
- **PWA instalable** (manifest + service worker) con **notificaciones push** (Web Push/VAPID, opt-in por dispositivo)
- Subida de archivos a disco (`uploads/`, servidos vía `/api/files/...`; galería/avatares públicos, documentos con autorización)

## Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Base de datos (Docker, puerto 5434)
docker compose up -d
#    …o usa tu propio PostgreSQL y ajusta DATABASE_URL en .env

# 3. Migraciones + datos de prueba
npm run db:migrate
npm run db:seed

# 4. Desarrollo
npm run dev
# Producción: npm run build && npm start
```

Abre <http://localhost:3000>.

### Cuentas de prueba (contraseña: `password123`)

| Correo | Rol |
| --- | --- |
| `admin@misescorts.com` | Administración |
| `hotel@misescorts.com` | Hotel aliado (Hotel Luna Azul) |
| `valentina@misescorts.com` | Profesional verificada premium |
| `cliente@misescorts.com` | Cliente verificado |

## Producción y despliegues

El sitio corre en **<https://misescorts.com>**: VPS de Vultr (Miami) con
[Dokploy](https://dokploy.com), HTTPS de Let's Encrypt (renovación automática)
y despliegue continuo desde GitHub. La guía de aprovisionamiento completa
(VPS, DNS, variables, backups) está en [DEPLOY.md](DEPLOY.md).

### Hacer un cambio y desplegarlo

```bash
# 1. Desarrolla y prueba en local
npm run dev                  # (npm run build si tocaste config/deps)

# 2. Sube el cambio
git add . && git commit -m "descripción del cambio" && git push
```

El push a `main` dispara el webhook de Dokploy y el deploy sale solo (~5 min
de build). Progreso en: panel Dokploy → proyecto → servicio Compose →
**Deployments**. Al terminar, verifica en <https://misescorts.com>.

### Cambios de esquema (Prisma)

```bash
# 1. En local: edita prisma/schema.prisma y crea la migración
npm run db:migrate           # la aplica a tu BD local y la deja en prisma/migrations/

# 2. Commit + push (la migración viaja con el código)

# 3. En el VPS (SSH), cuando el deploy termine:
cd /etc/dokploy/compose/*/code
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
```

### Variables de entorno y dominios

Se cambian en el panel de Dokploy (pestañas **Environment** y **Domains** del
servicio Compose) y **siempre requieren Redeploy** para aplicarse — las rutas
de Traefik y las variables se materializan en el deploy. Además, las
`NEXT_PUBLIC_*` se incrustan en el bundle durante el build: cambiarlas sin
redeploy no tiene ningún efecto.

### Rollback

```bash
git revert <commit-malo> && git push   # el webhook despliega la reversión
```

### Operación

- **Logs**: panel Dokploy (servicio → Logs) o en el VPS `docker ps` para ver el
  nombre del contenedor y `docker logs <contenedor-app> --tail 100`.
- **Backups**: nocturnos y cifrados a Backblaze B2 (`scripts/backup.sh` +
  cron; configuración en DEPLOY.md §7). Probar la restauración cada tanto.
- **Certificados**: Traefik renueva Let's Encrypt automáticamente.
- **BD de producción**: solo accesible desde la red interna de Docker del VPS
  (sin puerto expuesto); para inspeccionarla, `docker exec` al contenedor `db`.

## Estructura

```
prisma/            Esquema, migraciones y seed
src/lib/           db (Prisma), auth (sesiones), uploads, formato, ui
src/middleware.ts  Protección de rutas por cookie de sesión
src/components/    Nav, botón SOS, badges, avatar, estrellas…
src/app/
  (auth)/          login y registro
  (app)/           panel, verificación, perfil(es), chat, agenda,
                   citas, hoteles, reservas, reportes, admin/, hotel/
  api/files/       archivos subidos con control de acceso
  api/chat/        polling de mensajes
```

## Modelo de negocio soportado

- **Membresía premium** para profesionales (badge + prioridad en el directorio; activación manual desde admin en el MVP).
- **Comisión por reserva** de hotel (porcentaje configurable por hotel; se calcula y registra en cada reserva).
- **Verificación premium** (revisión prioritaria y distintivo).
- **Software de gestión para hoteles** (panel de reservas e ingresos).

## Notas de seguridad y privacidad

- Solo mayores de 18 años (validación de fecha de nacimiento + verificación documental).
- Los documentos de identidad solo son visibles para el usuario dueño y los administradores.
- El teléfono nunca se muestra públicamente; el chat es interno.
- Cuentas bloqueadas/suspendidas pierden sus sesiones activas.
- En producción ya hay HTTPS (Let's Encrypt vía Dokploy/Traefik), age-gate +18 y GA4. Pendiente: rate limiting, CDN para media cuando el tráfico de video pese (Bunny.net) y pasarela de pagos para membresías. Nunca se envían correos: las notificaciones son en plataforma y push opcional.
