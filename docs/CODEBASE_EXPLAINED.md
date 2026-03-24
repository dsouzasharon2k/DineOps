# DineOps — Complete Beginner's Guide to the Codebase

> Written for someone learning this codebase for the first time.
> Covers: architecture, code flow, design decisions, and interview prep.

---

## Table of Contents

1. [What Is This App?](#1-what-is-this-app)
2. [The Big Picture Architecture](#2-the-big-picture-architecture)
3. [What is Multi-Tenancy? (The Core Concept)](#3-what-is-multi-tenancy-the-core-concept)
4. [The Folder Structure — What Goes Where](#4-the-folder-structure--what-goes-where)
5. [The 3-Layer Pattern (Every Package Uses This)](#5-the-3-layer-pattern-every-package-uses-this)
6. [The Code Flow — Tracing a Customer Order Step by Step](#6-the-code-flow--tracing-a-customer-order-step-by-step)
7. [JWT Authentication — How Login Works](#7-jwt-authentication--how-login-works)
8. [The Database Design — Key Decisions](#8-the-database-design--key-decisions)
9. [Patterns Used — Explained Simply](#9-patterns-used--explained-simply)
10. [Tricky Interview Questions](#10-tricky-interview-questions)
11. [Extra Concepts Worth Knowing](#11-extra-concepts-worth-knowing)
12. [Tech Stack Summary](#12-tech-stack-summary)

---

## 1. What Is This App?

**DineOps** is a **Restaurant Management SaaS** (Software as a Service). Think of it like Shopify, but for restaurants. Instead of one restaurant using it, **many restaurants (tenants) share the same app** — each restaurant gets its own isolated data, dashboard, menu, orders, and analytics.

The app has three main parts:

| Part | What It Is |
|---|---|
| **Backend** | The brain. A Java server that stores data, runs business logic, and answers requests from the frontend. |
| **Frontend** | The face. A React web app that shows menus, dashboards, and kitchen screens. |
| **Database** | The memory. PostgreSQL stores everything permanently. |

---

## 2. The Big Picture Architecture

```
Customer (phone/browser)
        ↓
 [React Frontend]  ←→  [Spring Boot Backend API]  ←→  [PostgreSQL Database]
                                    ↕
                               [Redis Cache]
                                    ↕
                          [WebSocket (real-time)]
```

**Think of it like a restaurant itself:**

| Tech Component | Restaurant Analogy |
|---|---|
| Customer's browser | The customer who places an order |
| React Frontend | The waiter who takes the order |
| Spring Boot Backend | The kitchen that processes it |
| PostgreSQL | The pantry where all ingredients (data) live |
| Redis | The whiteboard for quick reminders (fast, temporary) |
| WebSocket | The ticket board that updates live for everyone |

---

## 3. What is Multi-Tenancy? (The Core Concept)

This is the most important concept in the entire codebase.

**The problem:** You build one restaurant app. Now 50 different restaurants want to use it. Do you build 50 separate apps? No — that's expensive and wasteful.

**The solution:** Build **one app**, but label every piece of data with a `tenant_id` (a UUID that identifies which restaurant it belongs to). So when McDonald's (tenant A) logs in, they only ever see their own menu items, orders, and staff — even though they share the same database as Pizza Hut (tenant B).

**How it's enforced in DineOps:**

1. **`TenantAuthorizationFilter`** (Java filter) — Before any request even reaches the business logic, this filter checks: "does this logged-in user belong to the restaurant they're trying to access?" If not, it returns 403 Forbidden immediately.
2. **Every database query** includes `WHERE tenant_id = ?` because every entity has a `tenant_id` column.

> **Why not separate databases per tenant?**
> Separate databases are operationally expensive (you'd need to run 50 Postgres instances), hard to query across tenants (analytics), and require per-tenant migrations. Shared database with row-level isolation is cheaper and simpler for a SaaS startup.

---

## 4. The Folder Structure — What Goes Where

```
backend/src/main/java/com/dineops/
├── auth/          → Login, JWT tokens, authentication filters
├── config/        → App settings (security rules, caching, WebSocket)
├── security/      → Rate limiting, account lockout
├── entity/        → Base "blueprint" that all database objects inherit from
├── restaurant/    → Restaurant management (the "tenant root")
├── menu/          → Menu categories and menu items
├── order/         → Orders — the most complex part of the app
├── inventory/     → Stock tracking per menu item
├── subscription/  → Paid plan management (STARTER / GROWTH / ENTERPRISE)
├── analytics/     → Dashboard stats for restaurant owners
├── audit/         → "Who did what and when" logs
├── review/        → Customer star ratings (1–5)
├── table/         → Physical restaurant tables with QR codes
├── notification/  → Email/SMS alert stubs
├── user/          → User accounts and DPDP deletion
├── exception/     → Handles errors gracefully with clean responses
├── logging/       → Attaches a unique ID to every request for tracing
└── dto/           → Data shapes used for sending/receiving API responses
```

---

## 5. The 3-Layer Pattern (Every Package Uses This)

Every feature in the backend follows the same 3-layer pattern. Using orders as an example:

```
OrderController.java   ← Layer 1: "Receptionist" — receives HTTP requests
       ↓
OrderService.java      ← Layer 2: "Manager" — runs business rules
       ↓
OrderRepository.java   ← Layer 3: "Filing Clerk" — talks to the database
```

| Layer | Job | What It Must NOT Do |
|---|---|---|
| **Controller** | Receive request, validate input, call service, return response | No business logic |
| **Service** | Run all business rules and orchestrate operations | No HTTP-specific code |
| **Repository** | Query and save data to the database | No business logic |

This is called **Separation of Concerns** — each layer has exactly one job. This makes the code easier to test, read, and change.

> **Spring generates the SQL for you.** A method named `findByTenantId(UUID tenantId)` in a repository automatically becomes `SELECT * FROM orders WHERE tenant_id = ?` — no SQL needed.

---

## 6. The Code Flow — Tracing a Customer Order Step by Step

Let's trace what happens when a customer scans a QR code at a restaurant table and places an order.

### Step 1: Customer scans the QR code

The QR code URL contains the `tenantId`. The browser opens `/menu/{tenantId}`. React calls:
```
GET /api/v1/restaurants/{tenantId}/menu
```

### Step 2: Menu is served (possibly from cache)

`MenuItemController` → `MenuItemService` → checks **Redis** first:
- **Cache hit:** Return menu instantly (no database query needed)
- **Cache miss:** Fetch from PostgreSQL, store in Redis for 5 minutes, return to user

> **Caching is like a chef memorizing a frequently ordered dish** instead of reading the full recipe every time.

### Step 3: Customer places an order

The frontend sends:
```
POST /api/v1/orders
Body: { items: [...], tableNumber: "T4", customerName: "Rohan", customerPhone: "98..." }
```

### Step 4: `OrderController` receives the request

It validates the incoming JSON with Bean Validation annotations (`@NotNull`, `@Min`, etc.), then passes control to `OrderService.placeOrder()`.

### Step 5: `OrderService.placeOrder()` runs all the checks

This is the most complex method in the codebase. It runs in this order:

```
1. Is the restaurant open right now?
   → OperatingHoursParser.isOpen() checks JSON operating hours vs. current time
   → If closed: throw exception → 400 Bad Request

2. Does the restaurant have an active subscription?
   → SubscriptionService.validateTenantCanPlaceOrder()
   → Checks plan (STARTER/GROWTH/ENTERPRISE) and monthly order count
   → If over limit: throw exception → 403 Forbidden

3. Fetch each menu item from the database
   → Check each item is available and belongs to this restaurant

4. Snapshot the prices
   → Copy price from MenuItem into OrderItem RIGHT NOW
   → Why? If the restaurant changes prices tomorrow, old receipts must show what was paid

5. Deduct inventory (if the restaurant tracks stock)
   → Reduce stock quantities in the inventory table

6. Save the order to PostgreSQL

7. Send notification
   → Email/SMS stubs (logged; actual sending is plugged in separately)

8. Publish WebSocket event
   → Broadcast full order to kitchen screens in real-time
```

### Step 6: Kitchen sees the new order instantly

The kitchen screen at `/dashboard/kitchen` is subscribed to WebSocket channel `/topic/orders/{tenantId}`. The moment the order is saved, Spring pushes the full order object to all connected kitchen screens — no page refresh needed.

### Step 7: Kitchen updates the order status

Chef clicks "Confirm" → `PATCH /api/v1/orders/{id}/status` → `OrderService.updateStatus()`:
- Checks if this transition is allowed (state machine — see below)
- Records the change in `order_status_history`
- Pushes the update via WebSocket to both kitchen and customer

### Step 8: Customer sees "Order Ready" on their phone

The customer's phone is subscribed to `/topic/order/{orderId}`. When the kitchen marks it READY, the customer's screen updates live with no page refresh.

---

## 7. JWT Authentication — How Login Works

**JWT (JSON Web Token)** is like a stadium wristband. Once the bouncer (server) puts it on your wrist at the entrance (login), you can walk everywhere without being asked for ID again — every security guard just checks the wristband.

### The Login Flow

```
1. User sends: POST /api/v1/auth/login  { email, password }

2. Server checks:
   - Is the account locked? (5 failed attempts → 15-min lockout, tracked in Redis)
   - Has this IP/email made too many attempts? (10/min rate limit, tracked in Redis)

3. BCrypt compares submitted password against stored hash
   → If wrong: increment failure counter, possibly lock account
   → If correct: generate tokens

4. Two tokens are created:
   - ACCESS TOKEN  (24h lifetime) → sent in JSON response body, stored in JS memory only
   - REFRESH TOKEN (7d lifetime)  → sent as httpOnly cookie (JS cannot read it)

5. Every subsequent API request sends:
   Authorization: Bearer {access_token}

6. JwtAuthFilter intercepts every request:
   → Validates the token signature and type
   → Extracts userId, tenantId, role
   → Puts this into SecurityContext (Spring's "who is this user?" holder)

7. When access token expires:
   → Frontend silently calls POST /api/v1/auth/refresh
   → Browser automatically sends the httpOnly cookie
   → Server issues new access + refresh tokens
   → User never sees a login screen
```

### Why Two Tokens?

| Token | Lifetime | Where Stored | Purpose |
|---|---|---|---|
| Access Token | 24 hours | JS memory only | Sent with every API request |
| Refresh Token | 7 days | httpOnly cookie | Used only to get a new access token |

**Security reasoning:** If someone steals your access token (e.g., via a bug), damage is limited to 24 hours. The refresh token is in an httpOnly cookie — JavaScript (and XSS attacks) cannot read it, making it much harder to steal.

---

## 8. The Database Design — Key Decisions

### Soft Deletes — Why We Don't Actually Delete Data

When you "delete" a menu item or user, the app does NOT run `DELETE FROM menu_items`. Instead it runs:
```sql
UPDATE menu_items SET deleted_at = NOW() WHERE id = ?
```

The row stays in the database. It's just marked as deleted.

**Why?**
- Orders reference menu items by ID. If you hard-deleted the item, old orders would lose their history ("what did this customer order?")
- Data recovery is trivial — just clear the `deleted_at` column
- Audits and reporting can still see what was deleted and when

**How does it work transparently?** Every entity class has:
```java
@SQLRestriction("deleted_at IS NULL")
```
Hibernate automatically appends `WHERE deleted_at IS NULL` to every query on that entity. You never forget to filter deleted records — it's automatic.

### Price in Paise (Not Rupees)

All prices are stored as **integers in paise** (the smallest unit of Indian currency, like cents).
- ₹99.50 → stored as `9950`
- ₹150.00 → stored as `15000`

**Why not just use a decimal?** Floating point numbers in computers are inherently imprecise:
```
0.1 + 0.2 = 0.30000000000000004  ← actual result in JavaScript/Java
```
For money, this is a serious bug. Integers are always exact. We only divide by 100 when formatting for display (e.g., on the invoice PDF).

### Flyway Migrations — Version Control for the Database

Flyway is like Git, but for your database schema. You write versioned SQL files:
```
V1__create_restaurants_and_users.sql
V2__menu_categories.sql
V3__menu_items.sql
...
V25__food_card_metadata.sql
```

Flyway tracks which files have already run in a `flyway_schema_history` table. On startup, it runs any new files automatically.

**Why?** Without this, every developer and every server would have to manually run SQL scripts, in the right order, without forgetting any. Flyway makes this automatic and reliable.

### UUID Primary Keys (Not Auto-Increment Numbers)

DineOps uses UUIDs (`3f7a2b1c-4a9b-...`) instead of `1, 2, 3, 4...` as primary keys.

**Why?**
- UUIDs are globally unique — you can generate them in the application without a database round-trip
- They don't reveal how many records exist (security: knowing order `#12` exists reveals the system is new)
- They work better in distributed systems and data migrations

---

## 9. Patterns Used — Explained Simply

### Caching with Redis

Redis is an ultra-fast in-memory database. DineOps uses it as a cache layer:

```
Request arrives
     ↓
Check Redis → Found? → Return immediately (no DB query)
     ↓ Not found
Query PostgreSQL
     ↓
Store result in Redis (with 5-min expiry)
     ↓
Return result
```

When data changes (menu item updated), the cache is "evicted" (deleted from Redis) so the next request fetches fresh data from the database.

> **Result:** If 1,000 customers load the menu simultaneously, only the **first** request hits PostgreSQL. The other 999 are served from Redis in milliseconds.

### AOP — Audit Logging Without Cluttering Your Code

**The problem:** You want to log every order creation, status update, and payment. You could add logging code to every method — but that's messy, repetitive, and easy to forget.

**The solution:** AOP (Aspect-Oriented Programming).

You put a small annotation on the method:
```java
@AuditedAction(entityType = "ORDER", action = "CREATE")
public OrderResponse placeOrder(...) {
    // business logic only — no logging code here
}
```

`AuditLogAspect` automatically intercepts the method, captures the inputs and result, serializes them to JSON, and saves an `audit_log` record. The business method is completely unaware of the logging.

> **Think of it like a security camera.** The people inside the building don't do anything differently — the camera just observes without interrupting their work.

### WebSocket — Real-Time Updates Without Refreshing

**Regular HTTP (polling):**
```
Browser: "Any updates?" → Server: "Nope"
Browser: "Any updates?" → Server: "Nope"
Browser: "Any updates?" → Server: "Nope"
Browser: "Any updates?" → Server: "Yes! New order!"
```
This wastes server resources and has up to N seconds of delay.

**WebSocket (push):**
```
Server: "New order just arrived!" → Browser updates instantly
Server: "Order status changed!" → Browser updates instantly
```

In DineOps, the moment an order is placed or updated, Spring immediately pushes the full order object to all connected kitchen screens and the customer's phone. No polling, no delay, no page refresh.

### State Machine for Orders

Orders can only move through a defined path:

```
PENDING ──→ CONFIRMED ──→ PREPARING ──→ READY ──→ DELIVERED
   │              │              │           │
   └──→ CANCELLED └──→ CANCELLED └──→ CANCELLED
```

This is enforced by a `Map<OrderStatus, Set<OrderStatus>>` in `OrderService`:
```java
ALLOWED_TRANSITIONS = {
    PENDING:    {CONFIRMED, CANCELLED},
    CONFIRMED:  {PREPARING, CANCELLED},
    PREPARING:  {READY, CANCELLED},
    READY:      {DELIVERED, CANCELLED}
}
```

Before any status change: check if the new status is in the allowed set. If not → throw an exception → 400 Bad Request.

**Why?** Without this, a bad API call or a frontend bug could put an order into a nonsensical state (e.g., DELIVERED before it was even CONFIRMED), breaking the entire kitchen workflow.

### The DTO Pattern — What You Show vs. What You Store

The `Order` database entity contains PII (customer phone/email), internal fields, and sensitive data. You don't want to send all of that to every client.

A **DTO (Data Transfer Object)** is a separate class that represents *only what you send to the client* — the fields they need, formatted the way they want.

```
Order (database entity)          OrderResponse (DTO — what client sees)
───────────────────────          ──────────────────────────────────────
id                          →    id
status                      →    status
customerPhone (PII)         →    (hidden)
paymentProviderOrderRef     →    (hidden)
totalAmount (in paise)      →    totalAmount + formattedAmount ("₹150.00")
orderItems                  →    orderItems (nested DTOs)
```

**Why?** Security (don't leak internal fields), flexibility (change DB schema without breaking the API), and clean API design.

---

## 10. Tricky Interview Questions

---

### Q1: "What is multi-tenancy and how did you implement it?"

**Answer:**
Multi-tenancy means multiple customers (restaurants) share one application and one database. Each restaurant's data is isolated by a `tenant_id` column on every table. We enforce this in two ways:
1. `TenantAuthorizationFilter` — a Spring Security filter that checks every request to ensure the logged-in user can only access their own restaurant's data.
2. Every JPA query includes `WHERE tenant_id = ?` automatically.

**Why not separate databases per tenant?**
Operationally expensive, hard to run cross-tenant analytics, and requires per-tenant migrations. Shared schema is simpler and cheaper for an early-stage SaaS.

---

### Q2: "Why do you store prices in paise instead of rupees?"

**Answer:**
Floating-point numbers cannot represent decimal values exactly in binary. `99.99 + 0.01` can equal `100.00000000001` in floating point. For financial calculations, this is a real bug. By storing amounts as integers (paise = 1/100th of a rupee), all arithmetic is exact. We only divide by 100 when formatting for display.

---

### Q3: "Explain JWT and why you use two tokens."

**Answer:**
JWT (JSON Web Token) is a signed string that carries claims (user ID, role, tenant ID) without needing a server-side session. The server signs it with a secret key — anyone can read it, but only the server can create or verify it.

Two tokens because:
- **Access token** (24h): sent with every request; if stolen, expires in 24h.
- **Refresh token** (7d): stored in an httpOnly cookie which JavaScript cannot read, making XSS attacks unable to steal it.

When the access token expires, the browser silently calls `/auth/refresh` using the cookie to get a new pair of tokens without asking the user to log in again.

---

### Q4: "What is a soft delete and why use it?"

**Answer:**
A soft delete sets a `deleted_at` timestamp instead of removing the row. The data stays in the database.

Reasons:
1. **Data integrity** — orders reference menu items; deleting an item would break old order history.
2. **Auditability** — you can see what was deleted and when.
3. **Recovery** — easily restore by clearing `deleted_at`.
4. **Compliance** — DPDP/GDPR may require data retention for certain periods.

We use `@SQLRestriction("deleted_at IS NULL")` in Hibernate so all queries automatically exclude deleted rows without any manual filtering.

---

### Q5: "Explain the order state machine. What happens on an invalid transition?"

**Answer:**
`OrderService` has a `Map<OrderStatus, Set<OrderStatus>> ALLOWED_TRANSITIONS`. Before any status update, we check: `if (!ALLOWED_TRANSITIONS.get(currentStatus).contains(newStatus)) throw new IllegalArgumentException(...)`.

`GlobalExceptionHandler` catches this and returns 400 Bad Request. This prevents nonsensical states like jumping from PENDING to DELIVERED and ensures the kitchen workflow is always coherent.

---

### Q6: "What is the difference between `@Cacheable` and `@CacheEvict`?"

**Answer:**
- `@Cacheable`: Check the cache first; if found, return without running the method. If not found, run the method and store the result in the cache.
- `@CacheEvict`: After the method runs, delete the specified cache entries so the next read fetches fresh data.

In DineOps: reading menu items uses `@Cacheable`. Creating or updating menu items uses `@CacheEvict` to invalidate stale cache entries.

---

### Q7: "What is AOP and how does your audit logging use it?"

**Answer:**
AOP (Aspect-Oriented Programming) lets you add behavior to methods without modifying them. You define an "aspect" (advice logic) and a "pointcut" (which methods to intercept).

In DineOps, `@AuditedAction` is a custom annotation. `AuditLogAspect` is an `@Around` advice — it lets the method run, then serializes the inputs and output to JSON, and saves an `AuditLog` record. The business methods contain zero logging code.

---

### Q8: "Why WebSocket instead of polling for the kitchen screen?"

**Answer:**
Polling means the browser asks "any updates?" every N seconds — it adds latency (up to N seconds), wastes server resources (constant requests even when nothing changed), and doesn't scale.

WebSocket creates a persistent two-way connection. The server pushes updates the moment they happen — zero delay, no wasted requests. For a kitchen screen where a new order could arrive any second, WebSocket is the right tool.

---

### Q9: "What is Flyway and why use it?"

**Answer:**
Flyway is a database migration tool. You write versioned SQL files (`V1__...sql`, `V2__...sql`). Flyway tracks which have run in a `flyway_schema_history` table and runs new ones automatically on startup.

This ensures every environment (developer laptop, staging, production) has the exact same schema, applied in the same order, without manual steps. It's version control for your database.

---

### Q10: "How does rate limiting work in your auth system?"

**Answer:**
We use a Redis counter with expiry. On each login attempt:
1. `INCR auth:rate:{email}` — atomically increment a counter
2. First increment: also call `EXPIRE auth:rate:{email} 60` to set a 60-second TTL
3. If counter exceeds 10: return 429 Too Many Requests
4. After 60 seconds: key expires automatically, counter resets

Redis is used (not in-memory) so the rate limit works across multiple backend server instances.

---

### Q11: "Why is `Page<RestaurantResponse>` not cacheable?"

**Answer:**
Spring's `Page` interface serializes to Redis as a `LinkedHashMap`. When Redis deserializes it, it can't reconstruct a proper `Page` object — it stays as `LinkedHashMap`, causing a `ClassCastException` at runtime. The fix requires a custom `PageImpl` deserializer. To avoid this complexity, paginated endpoints are intentionally excluded from caching.

---

### Q12: "How does subscription enforcement work?"

**Answer:**
Before saving any order, `OrderService.placeOrder()` calls `SubscriptionService.validateTenantCanPlaceOrder()` which:
1. Checks if the restaurant has a subscription — if not, throw error.
2. Checks if the subscription is active (with a 7-day grace period after expiry).
3. Counts orders this calendar month (`countByTenantIdAndCreatedAtGreaterThanEqual`) and compares against the plan limit (STARTER=300, GROWTH=2000, ENTERPRISE=unlimited).
4. If over the limit: throw error. The order is never saved.

---

### Q13: "What is DPDP compliance and how do you handle it?"

**Answer:**
DPDP is India's Digital Personal Data Protection Act (similar to GDPR). It gives users the right to delete their personal data.

In DineOps:
- `DELETE /users/me` sets `deletion_scheduled_for = now + 7 days` (cooling-off period).
- `UserDeletionJob` runs at 2 AM daily via `@Scheduled(cron = "0 0 2 * * *")`.
- It finds users past their `deletion_scheduled_for` and anonymizes: name → "Deleted User", email → `deleted_{id}@anon.local`, phone/password → null.
- The user row is then soft-deleted.
- Orders retain a `customer_data_erased_at` timestamp for audit purposes, but the PII itself is gone.

---

### Q14: "What is BCrypt and why hash passwords?"

**Answer:**
You never store passwords in plain text. If your database is breached, all user passwords are exposed.

Hashing is a one-way mathematical function — you can't reverse a hash back to the password. BCrypt is intentionally slow (~100ms per hash). This means an attacker who steals your hashed passwords would need ~100ms per brute-force attempt, making large-scale attacks impractical. BCrypt also adds a "salt" (random data) to each password before hashing, so two users with the same password have different hashes.

---

### Q15: "Walk me through the token refresh flow."

**Answer:**
1. The frontend stores the access token only in JS memory (not localStorage).
2. When an API call returns 401 (token expired), the Axios interceptor catches it.
3. Interceptor calls `POST /api/v1/auth/refresh` — the browser automatically sends the httpOnly cookie.
4. Server validates the refresh token from the cookie, issues new access + refresh tokens.
5. New access token is stored in memory. New refresh token overwrites the cookie.
6. The original failed API request is automatically retried with the new token.
7. The user never sees a login prompt.

---

### Q16: "What is `@Transactional` and why does it matter?"

**Answer:**
`@Transactional` on a service method means the entire method runs as one atomic database operation. If any part throws an exception, **everything is rolled back** — no partial writes.

Classic example: placing an order involves saving the `Order`, saving each `OrderItem`, and deducting inventory. If inventory deduction fails halfway through, without `@Transactional` you'd have an order in the database with no stock deducted. With `@Transactional`, the whole thing rolls back as if nothing happened.

---

### Q17: "Explain `@RestControllerAdvice` and why it's better than try-catch in every controller."

**Answer:**
`@RestControllerAdvice` defines a global error handler. Instead of wrapping every controller method in try-catch blocks, you define one central class (`GlobalExceptionHandler`) with `@ExceptionHandler` methods for specific exception types.

Benefits:
- **DRY (Don't Repeat Yourself)** — error handling logic is in one place.
- **Consistency** — all errors return the same `ApiError` structure.
- **Less clutter** — controllers stay clean and focused on their actual job.

---

## 11. Extra Concepts Worth Knowing

### Java Records (DTOs)
All DTOs (`OrderResponse`, `MenuItemResponse`, etc.) are Java `record` types. Records are immutable data carriers — the compiler auto-generates constructor, getters, `equals()`, `hashCode()`, and `toString()`. Perfect for DTOs that just carry data without any behavior.

### Generated Columns (V24 Migration)
`meal_period` on `orders` is a PostgreSQL **STORED generated column** — its value is automatically computed from `EXTRACT(HOUR FROM created_at)` by the database, always:
```sql
meal_period AS (
  CASE
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 6 AND 10  THEN 'BREAKFAST'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 11 AND 14 THEN 'LUNCH'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 15 AND 17 THEN 'SNACK'
    WHEN EXTRACT(HOUR FROM created_at) BETWEEN 18 AND 22 THEN 'DINNER'
    ELSE 'LATE'
  END
) STORED
```
No application code needed. Always consistent. Used for meal-period analytics.

### Partial Unique Indexes
V23 migration converts the `UNIQUE` constraints on `restaurants.slug` and `users.email` to **partial unique indexes**:
```sql
CREATE UNIQUE INDEX idx_restaurants_slug_active ON restaurants(slug) WHERE deleted_at IS NULL;
```
This means deleted slugs and emails can be reused — only active (non-deleted) rows must be unique.

### MDC (Mapped Diagnostic Context) — Request Tracing
`RequestContextFilter` generates a UUID `requestId` for every incoming HTTP request and puts it into the MDC (a thread-local map that logging frameworks can access). Every log line for that request automatically includes the `requestId`. This means in production logs, you can filter by a single `requestId` to see the complete trace of one specific request through the system.

### FSSAI Food Card (V25)
Added `menu_item_allergens` (with FSSAI Schedule IX enum values), `menu_item_flavour_tags`, and `menu_item_nutrition` (per-100g and per-serving nutritional data). The `vw_menu_item_card` view joins all of these into one clean card per item without row multiplication.

---

## 12. Tech Stack Summary

| Layer | Technology | Why This Choice |
|---|---|---|
| Language | Java 21 | Latest LTS; records, pattern matching |
| Framework | Spring Boot 3.5 | Industry standard; auto-configuration |
| Security | Spring Security + JWT | Stateless auth; fine-grained access control |
| Database | PostgreSQL | Robust; JSON support; generated columns; partial indexes |
| ORM | Hibernate / JPA | Maps Java classes to DB tables automatically |
| Migrations | Flyway | Versioned, repeatable schema management |
| Cache | Redis | Sub-millisecond reads; pub/sub for WebSocket |
| Real-time | WebSocket (STOMP) | Server-push; no polling |
| Frontend | React 19 + TypeScript | Type-safe; component-based |
| State | Zustand | Lightweight global state; localStorage persistence |
| HTTP Client | Axios | Interceptors for token injection + refresh |
| Build Tool | Vite | Fast HMR; modern ES module bundling |
| API Docs | Swagger / OpenAPI | Auto-generated interactive docs at `/swagger-ui.html` |
| Load Testing | k6 | Scripted performance tests |
| Monitoring | Prometheus + Grafana | Metrics scraping and dashboards |
| Containers | Docker + Kubernetes (Kind) | Local cluster with deployable manifests |

---

*Last updated: March 2026*
