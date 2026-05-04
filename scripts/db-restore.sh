#!/usr/bin/env bash
set -euo pipefail

BACKUP_FILE="${1:-}"
TARGET_DB="${2:-${POSTGRES_DB:-dineops}}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-dineops}"

if [[ -z "${BACKUP_FILE}" ]]; then
  echo "Usage: $0 <backup-file.dump> [target-db]"
  exit 1
fi

if [[ ! -f "${BACKUP_FILE}" ]]; then
  echo "Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "[restore] dropping and recreating database: ${TARGET_DB}"
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  psql -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${TARGET_DB};" >/dev/null

docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${TARGET_DB};" >/dev/null

echo "[restore] restoring dump into ${TARGET_DB}"
cat "${BACKUP_FILE}" | docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  pg_restore -U "${POSTGRES_USER}" -d "${TARGET_DB}" --no-owner --no-privileges >/dev/null

echo "[restore] validating critical tables"
docker compose -f "${COMPOSE_FILE}" exec -T "${POSTGRES_SERVICE}" \
  psql -U "${POSTGRES_USER}" -d "${TARGET_DB}" -tAc "SELECT to_regclass('public.orders') IS NOT NULL;" | grep -q "t"

echo "[restore] completed successfully"
