#!/usr/bin/env bash
# Backup nocturno de servicios-18: dump de Postgres + carpeta uploads,
# cifrado y versionado fuera del VPS con restic (Backblaze B2).
#
# Instalación en el VPS (una sola vez): ver DEPLOY.md sección "Backups".
# Cron sugerido (3:00 AM):
#   0 3 * * * /usr/local/bin/servicios18-backup.sh >> /var/log/servicios18-backup.log 2>&1
set -euo pipefail

# ── Configuración ────────────────────────────────────────────────
# Credenciales de restic/B2 (RESTIC_REPOSITORY, RESTIC_PASSWORD,
# B2_ACCOUNT_ID, B2_ACCOUNT_KEY) y COMPOSE_DIR viven en este archivo:
ENV_FILE="/etc/servicios18-backup.env"
[ -f "$ENV_FILE" ] && . "$ENV_FILE"

# Carpeta del docker-compose.prod.yml en el VPS (Dokploy la crea bajo /etc/dokploy).
COMPOSE_DIR="${COMPOSE_DIR:?Define COMPOSE_DIR en $ENV_FILE}"
COMPOSE="docker compose -f $COMPOSE_DIR/docker-compose.prod.yml"
# Área de staging local: restic versiona desde aquí (deduplica, así que
# sobrescribir el mismo nombre de dump está bien — el historial vive en restic).
STAGING="/var/backups/servicios18"

mkdir -p "$STAGING"

echo "[$(date -Is)] Dump de Postgres…"
$COMPOSE exec -T db pg_dump -U postgres servicios18 | gzip > "$STAGING/db.sql.gz"

echo "[$(date -Is)] Copiando uploads…"
# Resuelve el punto de montaje real del volumen "uploads" del servicio app.
APP_ID=$($COMPOSE ps -q app)
VOL=$(docker inspect "$APP_ID" -f '{{ range .Mounts }}{{ if eq .Destination "/app/uploads" }}{{ .Name }}{{ end }}{{ end }}')
MOUNT=$(docker volume inspect "$VOL" -f '{{ .Mountpoint }}')
rsync -a --delete "$MOUNT/" "$STAGING/uploads/"

echo "[$(date -Is)] Subiendo snapshot cifrado con restic…"
restic backup "$STAGING" --tag servicios18
# Retención: 7 diarios, 4 semanales, 6 mensuales.
restic forget --tag servicios18 --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune

echo "[$(date -Is)] Backup OK"
