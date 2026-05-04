# Local TLS Certs for Docker Compose

Place TLS certificate files in this directory when using the `tls` profile in `docker-compose.yml`.

Required file names:

- `fullchain.pem`
- `privkey.pem`

Quick self-signed example (PowerShell, for local dev only):

```powershell
New-Item -ItemType Directory -Force docker/certs | Out-Null
openssl req -x509 -newkey rsa:2048 -sha256 -days 365 -nodes `
  -keyout docker/certs/privkey.pem `
  -out docker/certs/fullchain.pem `
  -subj "/CN=localhost"
```

Run compose with TLS profile:

```powershell
docker compose --profile tls up -d --build
```

Then access the app via `https://localhost`.
