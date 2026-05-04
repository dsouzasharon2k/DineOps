# Railway Deployment Guide
*Quick deploy for interview demo — ~30 minutes end-to-end*

## Prerequisites
- Code pushed to GitHub (private repo is fine)
- Railway account at https://railway.app (free trial, no credit card needed)

---

## Step 1 — Push to GitHub
```bash
git add -A
git commit -m "feat: production-ready deploy"
git push origin main
```

---

## Step 2 — Create Railway Project

1. Go to https://railway.app → **New Project** → **Deploy from GitHub repo**
2. Select your `DineOps` repository
3. Railway will detect the repo — click **Add Service** and choose **Empty Service** for now (we'll configure each service manually)

---

## Step 3 — Add PostgreSQL and Redis

In your Railway project:

1. Click **+ New** → **Database** → **Add PostgreSQL** — Railway provisions it instantly
2. Click **+ New** → **Database** → **Add Redis** — Railway provisions it instantly

---

## Step 4 — Deploy the Backend

1. Click **+ New** → **GitHub Repo** → select `DineOps`
2. In the service settings:
   - **Root Directory**: `backend`
   - Railway will auto-detect the `Dockerfile`
3. Go to **Variables** tab and add:

```
SPRING_PROFILES_ACTIVE=dev
JWT_SECRET=<run: openssl rand -hex 32>

DB_URL=jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}
DB_USERNAME=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
SPRING_DATASOURCE_URL=jdbc:postgresql://${{Postgres.PGHOST}}:${{Postgres.PGPORT}}/${{Postgres.PGDATABASE}}

REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
SPRING_DATA_REDIS_HOST=${{Redis.REDIS_HOST}}
SPRING_DATA_REDIS_PORT=${{Redis.REDIS_PORT}}
SPRING_DATA_REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}

SMS_PROVIDER=mock
EMAIL_PROVIDER=mock
PAYMENT_PROVIDER=mock
PAYMENT_WEBHOOK_SHARED_SECRET=demo-webhook-secret

CORS_ALLOWED_ORIGINS=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
FRONTEND_BASE_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
PAYMENT_FRONTEND_BASE_URL=https://${{frontend.RAILWAY_PUBLIC_DOMAIN}}
```

4. Click **Deploy** — wait for health check to pass (`/actuator/health` returns `{"status":"UP"}`)

---

## Step 5 — Deploy the Frontend

1. Click **+ New** → **GitHub Repo** → select `DineOps` again
2. In service settings:
   - **Root Directory**: `frontend`
   - Railway will auto-detect the `Dockerfile`
3. Go to **Variables** tab and add:

```
VITE_API_URL=https://${{backend.RAILWAY_PUBLIC_DOMAIN}}
```

4. Click **Deploy**

---

## Step 6 — Generate JWT Secret

Run this locally and paste the output as `JWT_SECRET` in the backend service variables:

```powershell
# PowerShell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```

Or use any online hex generator for a 64-character random hex string.

---

## Step 7 — First Admin Setup

After deploy, promote your first user to SUPER_ADMIN:

1. Register an account via the frontend `/register` page
2. In Railway, open the PostgreSQL service → **Connect** tab → run:

```sql
UPDATE users
SET role = 'SUPER_ADMIN'
WHERE email = 'your-email@example.com';
```

---

## Step 8 — Verify

- Frontend: `https://<your-frontend>.railway.app` → landing page loads
- Backend health: `https://<your-backend>.railway.app/actuator/health` → `{"status":"UP"}`
- API docs: `https://<your-backend>.railway.app/swagger-ui.html` (dev profile only)

---

## Interview Demo Flow

1. Open `https://<frontend>.railway.app` — landing page
2. Register as restaurant owner → OTP shows in backend logs (mock mode)
3. Create a menu category and item
4. Generate a QR code for a table → scan → public menu
5. Place an order → Kitchen Display updates in real time
6. Check `/dashboard` analytics page

---

## Costs

Railway free trial gives $5 credit/month.  
This stack uses ~$0.50/day (Postgres + Redis + 2 services).  
The trial credit covers 10 days — more than enough for an interview.
