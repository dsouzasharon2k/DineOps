# Operations Runbook

## Database Backup and Restore

This project includes a PostgreSQL backup script with:
- daily backup output to `./backups/`
- 7-day retention (configurable)
- backup verification by restore into a temporary database

### Prerequisites

- Docker + Docker Compose available
- `postgres` service running from `docker-compose.yml`

### Run Backup Manually

From the repository root:

```bash
bash ./scripts/db-backup.sh
```

On Windows PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\db-backup.ps1
```

Optional environment overrides:

```bash
BACKUP_DIR=./backups \
RETENTION_DAYS=7 \
POSTGRES_DB=dineops \
POSTGRES_USER=dineops \
bash ./scripts/db-backup.sh
```

### Restore a Backup

1. Pick a backup file from `./backups/*.dump`
2. Create a target DB and restore:

```bash
docker compose exec -T postgres psql -U dineops -d postgres -c "CREATE DATABASE dineops_restore;"
cat ./backups/dineops_YYYYMMDD_HHMMSS.dump | docker compose exec -T postgres pg_restore -U dineops -d dineops_restore --no-owner --no-privileges
```

3. Validate expected tables:

```bash
docker compose exec -T postgres psql -U dineops -d dineops_restore -c "\dt"
```

### Daily Scheduling

Example cron entry (Linux runner/host):

```cron
0 2 * * * cd /path/to/PlatterOps && /usr/bin/bash ./scripts/db-backup.sh >> ./backups/backup.log 2>&1
```
