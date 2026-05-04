$ErrorActionPreference = "Stop"

$BackupFile = $args[0]
$TargetDb = if ($args.Count -ge 2) { $args[1] } elseif ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "dineops" }
$ComposeFile = if ($env:COMPOSE_FILE) { $env:COMPOSE_FILE } else { "docker-compose.yml" }
$PostgresService = if ($env:POSTGRES_SERVICE) { $env:POSTGRES_SERVICE } else { "postgres" }
$PostgresUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "dineops" }

if (-not $BackupFile) {
  throw "Usage: .\scripts\db-restore.ps1 <backup-file.dump> [target-db]"
}
if (-not (Test-Path $BackupFile)) {
  throw "Backup file not found: $BackupFile"
}

Write-Host "[restore] dropping and recreating database: $TargetDb"
docker compose -f $ComposeFile exec -T $PostgresService psql -U $PostgresUser -d postgres -c "DROP DATABASE IF EXISTS $TargetDb;" | Out-Null
docker compose -f $ComposeFile exec -T $PostgresService psql -U $PostgresUser -d postgres -c "CREATE DATABASE $TargetDb;" | Out-Null

Write-Host "[restore] restoring dump into $TargetDb"
Get-Content -Encoding Byte $BackupFile | docker compose -f $ComposeFile exec -T $PostgresService pg_restore -U $PostgresUser -d $TargetDb --no-owner --no-privileges | Out-Null

$verify = docker compose -f $ComposeFile exec -T $PostgresService psql -U $PostgresUser -d $TargetDb -tAc "SELECT to_regclass('public.orders') IS NOT NULL;"
if ($verify.Trim() -ne "t") {
  throw "Restore verification failed: public.orders not found."
}

Write-Host "[restore] completed successfully"
