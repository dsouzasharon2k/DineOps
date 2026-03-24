# Screenshots for README

Add these images to replace the placeholders in the main README:

| File | Description |
|------|-------------|
| `public-menu.png` | Public menu page — customer view with categories and add-to-cart |
| `dashboard.png` | Tenant dashboard — metrics, analytics, sidebar |
| `kitchen.png` | Kitchen view — real-time order queue with status controls |

---

## How to run the app for screenshots

### 1. Ensure .env is configured

```bash
cp .env.example .env
```

Edit `.env` and set **JWT_SECRET** to at least 32 characters (e.g. a 64-char hex string). Generate one:

```powershell
# PowerShell
-join ((1..64) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) })
```

Ensure `POSTGRES_PASSWORD` and `DB_PASSWORD` match in `.env`.

### 2. Start infrastructure

**Option A — Full Docker stack (backend + frontend in containers):**

```powershell
docker compose up -d
```

Wait ~30–60 seconds for everything to be healthy.

**Option B — Infra only, run backend/frontend locally:**

```powershell
docker compose up -d postgres redis
```

Then in separate terminals:

```powershell
# Terminal 1 — backend
cd backend; ./mvnw spring-boot:run

# Terminal 2 — frontend (after backend is up)
cd frontend; npm install; npm run dev
```

### 3. Seed demo data

With Docker running (postgres container must be up):

```powershell
Get-Content scripts/seed-demo-data.sql | docker exec -i dineops-postgres psql -U dineops -d dineops
```

Or with psql installed locally:
```bash
psql -h localhost -U dineops -d dineops -f scripts/seed-demo-data.sql
```
Password: your `POSTGRES_PASSWORD` from `.env`.

### 4. URLs to screenshot

| Screen | URL | Notes |
|--------|-----|-------|
| **Public Menu** | http://localhost:5173/menu/a085284e-ca00-4f64-a2c7-42fc0572bb97 | No login. Add items to cart for a fuller shot. |
| **Dashboard** | http://localhost:5173/login | Log in with `admin@dineops.com` / `password`, then go to Dashboard. |
| **Kitchen** | http://localhost:5173/dashboard/kitchen | Place an order from the public menu first (as customer), then capture the kitchen view. |

### 5. Capture and save

1. Take screenshots (e.g. 1200×700 or browser default)
2. Save as `public-menu.png`, `dashboard.png`, `kitchen.png` in this folder
3. Update `README.md` — replace the placeholder image URLs with `docs/screenshots/public-menu.png` etc.
