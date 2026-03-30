# PlatterOps Database View (Rectification Guide)

This document gives you a clean "DB view" of the platform and ready SQL views to support super-admin analytics and tenant operations.

Use this as a working checklist before production hardening.

---

## 1) Core Tables by Domain

### Identity and Tenant
- `users` (roles: `SUPER_ADMIN`, `TENANT_ADMIN`, `STAFF`, `CUSTOMER`)
- `restaurants` (tenant root)
- `subscriptions` (plan, status, period windows)

### Menu and Inventory
- `menu_categories`
- `menu_items`
- `inventory`

### Ordering and Kitchen
- `orders`
- `order_items`
- `order_status_history`
- `dining_tables`

### Platform/Audit
- `reviews`
- `audit_log`

---

## 2) Relationship Map (High Level)

- `restaurants.id` is the tenant root key.
- Most business tables carry `tenant_id -> restaurants.id`.
- `orders` links to restaurant (`tenant_id`) and optionally table (`table_id`) plus `table_number` snapshot.
- `order_items` links to `orders` and now also has denormalized `tenant_id`.
- `order_status_history` links to `orders` (tenant context resolved via join).
- `subscriptions` is tenant-scoped and used for billing/limits.

---

## 3) Rectification Focus (Priority)

1. Role-segment analytics for `SUPER_ADMIN` (platform KPIs).
2. Subscriber vs non-subscriber counts.
3. Restaurant revenue rollup (today/MTD/total).
4. Kitchen active queue analytics.
5. Future support/tickets and reviews moderation metrics.

---

## 4) SQL Reporting Views (Create These)

> Run these in PostgreSQL after current migrations.  
> These are read-only reporting views for dashboard/API consumption.

### 4.1 Restaurant Revenue KPIs

```sql
CREATE OR REPLACE VIEW vw_restaurant_revenue_kpis AS
SELECT
  r.id AS tenant_id,
  r.name AS restaurant_name,
  r.slug,
  r.status AS restaurant_status,
  COALESCE(SUM(CASE WHEN o.status = 'DELIVERED' THEN o.total_amount ELSE 0 END), 0) AS revenue_total,
  COALESCE(SUM(CASE
    WHEN o.status = 'DELIVERED'
      AND o.created_at::date = CURRENT_DATE
    THEN o.total_amount ELSE 0 END), 0) AS revenue_today,
  COALESCE(SUM(CASE
    WHEN o.status = 'DELIVERED'
      AND date_trunc('month', o.created_at) = date_trunc('month', now())
    THEN o.total_amount ELSE 0 END), 0) AS revenue_mtd,
  COALESCE(COUNT(*) FILTER (WHERE o.status IN ('PENDING','CONFIRMED','PREPARING','READY')), 0) AS active_orders,
  COALESCE(COUNT(*) FILTER (WHERE o.status = 'DELIVERED'), 0) AS delivered_orders
FROM restaurants r
LEFT JOIN orders o ON o.tenant_id = r.id
GROUP BY r.id, r.name, r.slug, r.status;
```

### 4.2 Subscription Split (Platform KPI)

```sql
CREATE OR REPLACE VIEW vw_platform_subscription_split AS
WITH latest_sub AS (
  SELECT DISTINCT ON (s.tenant_id)
    s.tenant_id,
    s.status,
    s.plan,
    s.current_period_start,
    s.current_period_end
  FROM subscriptions s
  ORDER BY s.tenant_id, s.created_at DESC
)
SELECT
  COUNT(*)::bigint AS total_restaurants,
  COUNT(*) FILTER (WHERE ls.status = 'ACTIVE')::bigint AS active_subscribers,
  COUNT(*) FILTER (WHERE ls.status IS NULL OR ls.status <> 'ACTIVE')::bigint AS non_subscribers
FROM restaurants r
LEFT JOIN latest_sub ls ON ls.tenant_id = r.id;
```

### 4.3 Super Admin Platform Snapshot

```sql
CREATE OR REPLACE VIEW vw_platform_snapshot AS
SELECT
  now() AS generated_at,
  (SELECT COUNT(*)::bigint FROM restaurants) AS total_restaurants,
  (SELECT COUNT(*)::bigint FROM users WHERE role = 'TENANT_ADMIN') AS tenant_admins,
  (SELECT COUNT(*)::bigint FROM users WHERE role = 'STAFF') AS staff_users,
  (SELECT COUNT(*)::bigint FROM users WHERE role = 'CUSTOMER') AS customer_users,
  (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'DELIVERED') AS lifetime_revenue,
  (SELECT COALESCE(SUM(total_amount), 0)
   FROM orders
   WHERE status = 'DELIVERED'
     AND created_at::date = CURRENT_DATE) AS revenue_today,
  (SELECT COUNT(*)::bigint
   FROM orders
   WHERE status IN ('PENDING','CONFIRMED','PREPARING','READY')) AS active_orders_now;
```

### 4.4 Kitchen Queue Health (Per Tenant)

```sql
CREATE OR REPLACE VIEW vw_kitchen_queue_health AS
SELECT
  o.tenant_id,
  COUNT(*) FILTER (WHERE o.status = 'PENDING')::bigint AS pending_count,
  COUNT(*) FILTER (WHERE o.status = 'CONFIRMED')::bigint AS confirmed_count,
  COUNT(*) FILTER (WHERE o.status = 'PREPARING')::bigint AS preparing_count,
  COUNT(*) FILTER (WHERE o.status = 'READY')::bigint AS ready_count,
  ROUND(AVG(
    CASE
      WHEN o.status IN ('PREPARING','READY','DELIVERED')
      THEN EXTRACT(EPOCH FROM (COALESCE(o.updated_at, now()) - o.created_at)) / 60.0
      ELSE NULL
    END
  )::numeric, 2) AS avg_prep_minutes_est
FROM orders o
GROUP BY o.tenant_id;
```

---

## 5) Suggested Index Additions (If Missing)

```sql
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created_status
  ON orders (tenant_id, created_at, status);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_created
  ON subscriptions (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_delivered_created
  ON orders (created_at)
  WHERE status = 'DELIVERED';
```

---

## 6) Future Scope Views

When you add support workflows:

- `tickets` table -> `vw_support_ticket_sla` (open, overdue, avg resolution time).
- `reviews` moderation -> `vw_reviews_moderation_queue` (flagged/pending/approved counts by tenant).
- `incidents` table -> `vw_platform_incidents_summary`.

---

## 7) Super Admin Access Intent

Super admin should primarily consume platform views (not tenant ops pages):

- Platform revenue (today, MTD, lifetime)
- Restaurant-wise revenue
- Subscriber vs non-subscriber split
- Active order load by tenant
- Future: reviews moderation and support tickets

Tenant admins/staff should consume operational views:

- Menu, Kitchen, Inventory, Tables, Subscription

