#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-dineops}"
POSTGRES_USER="${POSTGRES_USER:-dineops}"

timestamp="$(date +"%Y%m%d_%H%M%S")"
backup_file="${BACKUP_DIR}/dineops_${timestamp}.dump"
tmp_db="dineops_backup_verify_${timestamp}"

mkdir -p "${BACKUP_DIR}"

echo "[backup] creating dump: ${backup_file}"
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_dump -U "${POSTGRES_USER}" -d "${POSTGRES_DB}" -F c > "${backup_file}"

echo "[backup] verifying restore into temp db: ${tmp_db}"
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${tmp_db};" >/dev/null

cat "${backup_file}" | docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_restore -U "${POSTGRES_USER}" -d "${tmp_db}" --no-owner --no-privileges >/dev/null

docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  psql -U "${POSTGRES_USER}" -d "${tmp_db}" -tAc \
  "SELECT to_regclass('public.orders') IS NOT NULL;" | grep -q "t"

docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  psql -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE ${tmp_db};" >/dev/null

echo "[backup] applying retention: delete files older than ${RETENTION_DAYS} days"
find "${BACKUP_DIR}" -type f -name "*.dump" -mtime "+${RETENTION_DAYS}" -delete

echo "[backup] completed successfully"
