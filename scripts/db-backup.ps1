$ErrorActionPreference = "Stop"

$BackupDir = if ($env:BACKUP_DIR) { $env:BACKUP_DIR } else { "./backups" }
$RetentionDays = if ($env:RETENTION_DAYS) { [int]$env:RETENTION_DAYS } else { 7 }
$ComposeFile = if ($env:COMPOSE_FILE) { $env:COMPOSE_FILE } else { "docker-compose.yml" }
$PostgresService = if ($env:POSTGRES_SERVICE) { $env:POSTGRES_SERVICE } else { "postgres" }
$PostgresDb = if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "dineops" }
$PostgresUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "dineops" }

if (-not (Test-Path $BackupDir)) {
  New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupDir "dineops_$timestamp.dump"
$tmpDb = "dineops_backup_verify_$timestamp"

Write-Host "[backup] creating dump: $backupFile"
docker compose -f $ComposeFile exec -T $PostgresService pg_dump -U $PostgresUser -d $PostgresDb -F c | Set-Content -Encoding Byte $backupFile

Write-Host "[backup] verifying restore into temp db: $tmpDb"
docker compose -f $ComposeFile exec -T $PostgresService psql -U $PostgresUser -d postgres -c "CREATE DATABASE $tmpDb;" | Out-Null

Get-Content -Encoding Byte $backupFile | docker compose -f $ComposeFile exec -T $PostgresService pg_restore -U $PostgresUser -d $tmpDb --no-owner --no-privileges | Out-Null

$verify = docker compose -f $ComposeFile exec -T $PostgresService psql -U $PostgresUser -d $tmpDb -tAc "SELECT to_regclass('public.orders') IS NOT NULL;"
if ($verify.Trim() -ne "t") {
  throw "Backup verification failed: public.orders not found after restore."
}

docker compose -f $ComposeFile exec -T $PostgresService psql -U $PostgresUser -d postgres -c "DROP DATABASE $tmpDb;" | Out-Null

Write-Host "[backup] applying retention: delete files older than $RetentionDays days"
$cutoff = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem -Path $BackupDir -Filter "*.dump" -File | Where-Object { $_.LastWriteTime -lt $cutoff } | Remove-Item -Force

Write-Host "[backup] completed successfully"
