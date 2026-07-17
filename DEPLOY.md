# Despliegue en producción — Vultr Miami + Dokploy

Arquitectura: VPS Vultr (Miami) corriendo Dokploy (deploys automáticos desde
GitHub + HTTPS con Traefik), la app Next.js y Postgres en Docker con volúmenes
persistentes (`uploads/` y datos de la BD), dominio y DNS en Hostinger, y
backups nocturnos cifrados a Backblaze B2. CDN (Bunny.net) queda como mejora
futura cuando el tráfico de video pese.

```
Hostinger (dominio + DNS)          Backblaze B2 (backups cifrados)
        │ A record                        ▲ restic (cron 3 AM)
        ▼                                 │
┌─ VPS Vultr Miami ────────────────────────────────┐
│ Dokploy (Traefik :443) → app :3000 → db :5432    │
│ volúmenes: uploads/, pgdata                      │
└──────────────────────────────────────────────────┘
```

## 1. Subir el código a GitHub

El `.gitignore` ya excluye `.env*` y `uploads/`. Repo **privado**:

```bash
git init
git add .
git commit -m "MVP listo para despliegue"
gh repo create servicios-18 --private --source=. --push
# (o crea el repo vacío en github.com y haz git remote add + push)
```

## 2. Crear el VPS en Vultr

1. Products → Deploy new server → **Cloud Compute – Shared CPU**.
2. Ubicación: **Miami**. SO: **Ubuntu 24.04 LTS**.
3. Plan: mínimo **1 vCPU / 2 GB RAM** (con 4 GB el build va más holgado).
4. Añade tu llave SSH. Activa **Auto Backups** (snapshot semanal, ~20% extra).
5. Anota la IP pública.

## 3. Instalar Dokploy

```bash
ssh root@IP_DEL_VPS
apt update && apt upgrade -y
curl -sSL https://dokploy.com/install.sh | sh
```

Abre `http://IP_DEL_VPS:3000` y **crea la cuenta admin de inmediato** (el
primer registro se queda con el panel).

## 4. DNS en Hostinger

hPanel → Dominios → tu dominio → **DNS / Nameservers**:

| Tipo  | Nombre | Valor        | TTL   |
|-------|--------|--------------|-------|
| A     | @      | IP_DEL_VPS   | 14400 |
| CNAME | www    | tudominio.com| 14400 |

(Para migraciones futuras: bajar el TTL a 300 un día antes de cambiar la IP.)

## 5. Configurar la app en Dokploy

1. Create Project → Create Service → **Compose**.
2. Provider: GitHub → autoriza y elige el repo `servicios-18`, rama `main`.
3. Compose Path: `./docker-compose.prod.yml`.
4. En **Environment**, pega las variables de `.env.production.example` con
   valores reales:
   - `POSTGRES_PASSWORD` → `openssl rand -hex 24`
   - `NEXT_PUBLIC_SITE_URL` → `https://tudominio.com`
   - VAPID: genera un par **nuevo** con `npx web-push generate-vapid-keys`
5. **Deploy**. El primer build tarda varios minutos.
6. En **Domains** del servicio: host `tudominio.com`, service `app`, port
   `3000`, HTTPS on (Let's Encrypt). Repite para `www`.

Desde ahora, cada `git push` a `main` despliega solo.

## 6. Esquema de BD y seed (una sola vez)

En el VPS (Dokploy guarda el compose bajo `/etc/dokploy/compose/<servicio>/code`):

```bash
cd /etc/dokploy/compose/*/code   # ajusta si tienes varios servicios
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate
```

**Seed — ojo:** `prisma/seed.ts` crea cuentas de prueba con contraseña
`password123`. Para producción, edítalo antes (deja solo el admin con una
contraseña fuerte) o cambia las contraseñas apenas entres:

```bash
docker compose -f docker-compose.prod.yml --profile tools run --rm migrate npm run db:seed
```

Los cambios de esquema futuros son el mismo comando `migrate` (usa
`prisma db push`; si algún cambio implica pérdida de datos, Prisma lo aborta
y te lo dice — ahí decides con `--accept-data-loss` o migración manual).

## 7. Backups cifrados a Backblaze B2

1. Crea cuenta en Backblaze → bucket **privado** `servicios18-backups` →
   App Key con acceso a ese bucket.
2. En el VPS:

```bash
apt install -y restic rsync
cp scripts/backup.sh /usr/local/bin/servicios18-backup.sh   # desde el repo clonado
chmod +x /usr/local/bin/servicios18-backup.sh

cat > /etc/servicios18-backup.env <<'EOF'
export COMPOSE_DIR="/etc/dokploy/compose/TU_SERVICIO/code"
export B2_ACCOUNT_ID="keyID_de_backblaze"
export B2_ACCOUNT_KEY="applicationKey"
export RESTIC_REPOSITORY="b2:servicios18-backups:vps"
export RESTIC_PASSWORD="frase-larga-y-unica"   # SIN ella los backups son irrecuperables: guárdala en tu gestor de contraseñas
EOF
chmod 600 /etc/servicios18-backup.env

. /etc/servicios18-backup.env && restic init      # una sola vez
/usr/local/bin/servicios18-backup.sh              # prueba manual
crontab -e   # añadir:
# 0 3 * * * . /etc/servicios18-backup.env && /usr/local/bin/servicios18-backup.sh >> /var/log/servicios18-backup.log 2>&1
```

3. **Prueba la restauración** al menos una vez: `restic restore latest --target /tmp/prueba`.

## 8. Post-despliegue

- [ ] Verifica el sitio en `https://tudominio.com` (perfil, subida de fotos, push).
- [ ] Google Search Console: verifica el dominio y envía `https://tudominio.com/sitemap.xml` (pendiente de la estrategia SEO).
- [ ] Cambia/elimina las cuentas seed de prueba.
- [ ] Age-gate de entrada + registros de verificación de edad — **pendiente de
  implementar**; condición práctica de la política de Vultr para contenido adulto.

## Si hay que migrar de host (plan B: MojoHost / ViceTemple)

1. Nuevo VPS con Dokploy (pasos 3 y 5) — mismo repo, mismas variables.
2. Datos, con el servidor viejo vivo: `pg_dump` + `rsync` de uploads al nuevo;
   o desde cero: `restic restore latest` y cargar dump + `uploads/` al volumen.
3. Bajar TTL en Hostinger, cambiar el registro A a la IP nueva. Las URLs no
   cambian (`/api/files/...` es relativa al dominio), el SEO sobrevive intacto.
