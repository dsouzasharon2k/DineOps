# PlatterOps — Documentation Audit & Codebase Improvements

> Generated after a full cross-reference of every doc file against the actual codebase.
> Covers: factual errors in docs, missing features, code quality issues, and improvement roadmap.

---

## Table of Contents

1. [Documentation Accuracy Issues (Must Fix)](#1-documentation-accuracy-issues-must-fix)
2. [Codebase Bugs & Issues](#2-codebase-bugs--issues)
3. [Missing Features & Incomplete Implementations](#3-missing-features--incomplete-implementations)
4. [Security Improvements Needed](#4-security-improvements-needed)
5. [Performance Improvements](#5-performance-improvements)
6. [Testing Gaps](#6-testing-gaps)
7. [Infrastructure & DevOps Improvements](#7-infrastructure--devops-improvements)
8. [Code Quality & Architecture](#8-code-quality--architecture)
9. [Frontend Improvements](#9-frontend-improvements)
10. [Feature Additions Worth Considering](#10-feature-additions-worth-considering)

---

## 1. Documentation Accuracy Issues (Must Fix)

These are factual errors where the docs claim something that doesn't match the actual code.

---

### 1.1 `CDAC_INTERVIEW_ANSWERS.md` — InvoicePdfGenerator class doesn't exist

**What the doc says (Q on StringBuilder):**
> `InvoicePdfGenerator` builds invoice text dynamically using `StringBuilder`.

**What's actually in the code:**
There is no `InvoicePdfGenerator` class anywhere in the codebase. The invoice logic is inline in `OrderService.generateInvoicePdf()` (lines 312–346). It does use `StringBuilder`, but the class name referenced in the docs is fabricated.

**Fix:** Replace `InvoicePdfGenerator` with `OrderService.generateInvoicePdf()`.

---

### 1.2 `CDAC_INTERVIEW_ANSWERS.md` — Menu item caching claims are wrong

**What the doc says:**
> ```java
> @Cacheable(value = "menu:items", key = "#tenantId")
> public List<MenuItemResponse> getMenuItems(UUID tenantId) { ... }
>
> @CacheEvict(value = "menu:items", key = "#tenantId")
> public MenuItemResponse createItem(UUID tenantId, ...) { ... }
> ```

**What's actually in the code:**
`MenuItemService` has **zero** caching annotations — no `@Cacheable`, no `@CacheEvict`. Caching is only used on `OrderService` (for order-related caches: `orders:by-id`, `orders:active-by-tenant`, `orders:by-tenant`). Menu items are fetched from PostgreSQL on every request.

**Fix:** Either add `@Cacheable`/`@CacheEvict` to `MenuItemService` (recommended), or update the docs to reflect that only orders are cached.

---

### 1.3 `CDAC_INTERVIEW_ANSWERS.md` — Session stateless config is wrong YAML

**What the doc says:**
> ```yaml
> spring:
>   security:
>     session:
>       management:
>         stateless: true
> ```

**What's actually in the code:**
This YAML property doesn't exist in `application.yml` and is not a valid Spring Boot property. Stateless session management is configured programmatically in `SecurityConfig.java` via `sessionManagement(session -> session.sessionCreationPolicy(STATELESS))`.

**Fix:** Replace the YAML example with the actual Java configuration.

---

### 1.4 `CDAC_INTERVIEW_ANSWERS.md` — @SQLRestriction "on all entities" is wrong

**What the doc says (annotations table):**
> `@SQLRestriction` — All entities — Appends `WHERE deleted_at IS NULL` to every query.

**What's actually in the code:**
Not all entities have `@SQLRestriction`. Specifically, `Review`, `AuditLog`, and `OrderStatusHistory` do NOT have it. `Review` doesn't even extend `AuditableEntity` — it manages its own `createdAt` with `@PrePersist`.

**Fix:** Change "All entities" to "Most entities (Order, MenuItem, Restaurant, User, MenuCategory, DiningTable, Inventory, Subscription)".

---

### 1.5 `JUNIOR_DEV_INTERVIEW.md` Q29 — Deletion grace period is 7 days, not 30

**What the doc says:**
> When a user requests deletion, `deletion_scheduled_for` is set to **30 days** in the future.

**What's actually in the code:**
`UserService.scheduleDeletion()` sets `user.setDeletionScheduledFor(now.plusDays(7))` — that's **7 days**, not 30.

**Fix:** Change "30 days" to "7 days".

---

### 1.6 `JUNIOR_DEV_INTERVIEW.md` Q33 — Flyway does NOT run in tests

**What the doc says:**
> Integration tests use `@ActiveProfiles("test")`. Flyway still runs all migrations against H2 on test startup.

**What's actually in the code:**
`application-test.yml` explicitly disables Flyway:
```yaml
spring:
  flyway:
    enabled: false
  jpa:
    hibernate:
      ddl-auto: create-drop
```
Flyway is disabled. Hibernate `create-drop` generates the schema from entity annotations, not from Flyway migrations. This means test schema can drift from production schema.

**Fix:** Update the doc to say Flyway is disabled in tests and Hibernate `create-drop` is used. Separately, consider enabling Flyway in tests (see Testing Gaps section below).

---

### 1.7 `JUNIOR_DEV_INTERVIEW.md` Q37 — Absent day key behavior is wrong

**What the doc says:**
> A missing key (key not present at all) is different from null — a missing key is treated as "always open" for backward compatibility with older restaurant records.

**What's actually in the code:**
`OperatingHoursParser.isOpen()` line 51: `if (dayNode == null || dayNode.isNull()) return false;`. Both absent key (`null` from `.get()`) and explicit JSON `null` value return `false` (closed). The code's own Javadoc correctly says: "null or absent day = closed that day".

**Fix:** Change the answer to: "Both absent key and null value mean the restaurant is closed. Only a null/blank/malformed entire operatingHours string means always open (backward compat)."

---

### 1.8 `CODEBASE_EXPLAINED.md` — Claims initial PENDING history is saved

**What the doc says (Step 5 of order flow):**
> 7. The initial `OrderStatusHistory` record (`PENDING`) is saved.

**What's actually in the code:**
`OrderService.placeOrder()` does NOT save an initial `OrderStatusHistory` record. The `saveStatusHistory()` method is only called from `updateStatus()` and `customerCancelOrder()` — transitions only, not initial state.

**Fix:** Remove or correct step 7. The first history entry appears when the status changes from PENDING to CONFIRMED.

---

### 1.9 `CODEBASE_EXPLAINED.md` — Claims "13 REST controllers"

**What's actually in the code:**
There are exactly 13 controller classes (`OrderController`, `MenuItemController`, `MenuCategoryController`, `RestaurantController`, `UserController`, `AuthController`, `InventoryController`, `SubscriptionController`, `AnalyticsController`, `AuditLogController`, `StaffController`, `DiningTableController`, `ReviewController`). This is correct.

---

### 1.10 `PROJECT_PITCH.md` — @EnableRedisMessageBroker doesn't exist

**What the doc says (What I Would Do Differently):**
> Switching to a Redis message broker requires only a `@EnableRedisMessageBroker` configuration change.

**What's actually true:**
`@EnableRedisMessageBroker` is not a real Spring annotation. Switching to Redis pub/sub for WebSocket requires configuring `StompBrokerRelayMessageHandler` with a relay to a Redis-backed message broker, which involves significantly more than a single annotation.

**Fix:** Remove the specific annotation reference and describe the change more accurately.

---

### 1.11 `JUNIOR_DEV_INTERVIEW.md` Q4 — Test database description

**What the doc says:**
> `@SpringBootTest` integration tests with H2 in-memory DB.

**Partially correct** but misleading — it implies Flyway runs against H2. In reality, Flyway is disabled and Hibernate auto-generates the schema, meaning test schema can differ from production.

---

### 1.12 Multiple docs — "Redis dual-use" for WebSocket pub/sub is aspirational

Several docs (CDAC, CODEBASE_EXPLAINED, PROJECT_PITCH) describe Redis pub/sub as part of the WebSocket architecture. In reality, the current WebSocket setup uses Spring's in-memory `SimpleBrokerMessageHandler`. Redis is used only for caching and rate limiting. The pub/sub Redis use is planned but not implemented.

**Fix:** Clearly mark Redis pub/sub for WebSocket as "future" or "planned" in all docs.

---

## 2. Codebase Bugs & Issues

---

### 2.1 Invoice "PDF" is actually plain text

`OrderService.generateInvoicePdf()` builds a `StringBuilder` of plain text and returns it as `byte[]`. The controller serves it with `Content-Type: application/pdf` and filename `invoice.pdf`, but the content is UTF-8 text — not a valid PDF file. Opening this in a PDF reader will fail or show garbled text.

**Fix:** Either:
- Add a real PDF library (iText, Apache PDFBox, or OpenPDF) to generate actual PDFs, or
- Change the content type to `text/plain` and filename to `invoice.txt` to be honest about the format

---

### 2.2 MenuItemResponse returns empty lists for allergens/nutrition/flavourTags

`MenuItemService.toResponse()` passes `new ArrayList<>()` for `flavourProfile`, `allergens`, and `nutrition` fields. V25 migration creates the database tables (`menu_item_allergens`, `menu_item_nutrition`, `menu_item_flavour_tags`), but the `MenuItem` entity has no JPA mappings to these tables. The data is never read or written.

**Fix:** Add `@OneToMany` relationships on `MenuItem` to the allergen/nutrition/flavour tag entities, and populate them in `toResponse()`.

---

### 2.3 Review entity doesn't follow project patterns

`Review` does not extend `AuditableEntity` — it manually manages its own `createdAt` via `@PrePersist`. It also lacks `@SQLRestriction`, `updatedAt`, and `deletedAt` fields. This means:
- Reviews cannot be soft-deleted
- No `updatedAt` tracking
- Inconsistent with every other entity in the project

**Fix:** Make `Review` extend `AuditableEntity` and add `@SQLRestriction("deleted_at IS NULL")`.

---

### 2.4 InventoryRepository method naming may be incorrect

`InventoryRepository.findByTenantIdOrderByUpdatedAtDesc` uses `tenantId` directly, but `Inventory` has a `tenant` (Restaurant) relation object, not a direct `tenantId` field. Spring Data JPA convention for navigating relationships is `findByTenant_IdOrderByUpdatedAtDesc` (with underscore to traverse the property path).

**Fix:** Verify this query actually works. If it does (Spring sometimes resolves it), rename for clarity. If not, fix to `findByTenant_IdOrderByUpdatedAtDesc`.

---

### 2.5 OrderStatusHistory.changedBy is String, not UUID FK

`OrderStatusHistory.changedBy` is a `String` field, not a proper FK to `users.id`. The `resolveChangedBy()` method returns `authentication.getName()` which is the userId as a string. The DB_VIEW doc and ER diagram show it as `uuid changed_by FK` which is misleading.

**Fix:** Consider making it a proper `@ManyToOne` relationship to `User`, or update docs to reflect it's a String.

---

### 2.6 No @PreAuthorize on most controller endpoints

Looking at the controllers, most endpoints lack `@PreAuthorize` role-based access control annotations. While the `TenantAuthorizationFilter` handles tenant isolation, there's no fine-grained role check on many endpoints. For example, `MenuItemController.createItem()` has no role restriction — any authenticated user of the correct tenant could create menu items.

**Fix:** Add `@PreAuthorize` annotations to restrict write operations to `TENANT_ADMIN`/`SUPER_ADMIN` roles.

---

## 3. Missing Features & Incomplete Implementations

---

### 3.1 NotificationService is a stub

`NotificationService.sendOrderPlacedNotification()` and `sendOrderStatusNotification()` only log messages — no actual email or SMS is sent. This is correctly described as "stubs" in some docs, but other docs imply actual sending.

**What to do:** Either integrate a real notification provider (SendGrid for email, Twilio for SMS, or Firebase Cloud Messaging for push), or clearly mark this as a stub everywhere in docs.

---

### 3.2 Menu item caching is completely missing

Despite extensive documentation about Redis caching for menu items, `MenuItemService` has zero caching annotations. Every menu page load hits PostgreSQL directly.

**What to do:** Add `@Cacheable` and `@CacheEvict` annotations to `MenuItemService` as documented:
```java
@Cacheable(value = "menu:items", key = "#tenantId")
public List<MenuItemResponse> getItemResponsesByTenant(UUID tenantId) { ... }

@CacheEvict(value = "menu:items", allEntries = true)
public MenuItemResponse createItemResponse(...) { ... }
```

---

### 3.3 No customer_data_erased_at implementation

V23 migration adds `customer_data_erased_at` to the `orders` table, and the docs describe anonymizing guest customer PII on orders. However, `UserDeletionJob` only anonymizes the `users` table — it does not touch orders' `customer_name`, `customer_phone`, or `customer_email` fields. Guest order PII remains forever.

**What to do:** Extend `UserDeletionJob` or create a separate job to anonymize PII on orders when the associated user is deleted, and set `customer_data_erased_at`.

---

### 3.4 No FSSAI food card data flow (V25 tables unused)

V25 creates `menu_item_allergens`, `menu_item_nutrition`, and `menu_item_flavour_tags` tables plus the `vw_menu_item_card` view. However:
- No JPA entities for these tables
- No repository/service/controller to CRUD this data
- `MenuItemService.toResponse()` returns empty lists
- The `vw_menu_item_card` view is never queried

**What to do:** Create JPA entities, repositories, and API endpoints for managing food card metadata, or remove V25 if it's premature.

---

### 3.5 No V24 analytics views consumed by the backend

V24 creates `vw_accurate_prep_times`, `vw_item_revenue`, and `vw_review_order_context` views. However, `AnalyticsService` computes analytics from raw entity queries and Java streams — it doesn't query these views at all.

**What to do:** Refactor `AnalyticsService` to use the pre-built SQL views, or create new analytics endpoints that leverage them.

---

### 3.6 DB_VIEW.md views are proposals, not implemented

`DB_VIEW.md` proposes views like `vw_restaurant_revenue_kpis`, `vw_platform_subscription_split`, `vw_platform_snapshot`, and `vw_kitchen_queue_health`. None of these exist as Flyway migrations or are consumed by the backend.

**What to do:** If these are needed, create them as V26+ migrations and build API endpoints to expose them.

---

### 3.7 No @Cacheable on MenuCategoryService either

Like `MenuItemService`, `MenuCategoryService` also has no caching. Category lists are fetched from DB on every menu page load.

---

## 4. Security Improvements Needed

---

### 4.1 No JWT token revocation/blacklist

When a user logs out, the server deletes the refresh cookie. But the access token remains valid until it expires (24h in dev, 15min in prod). A compromised token cannot be revoked.

**What to do:** Implement a Redis-backed token blacklist. On logout, add the token's `jti` (JWT ID) to Redis with TTL matching the token's remaining lifetime.

---

### 4.2 No password complexity validation

`AuthController.register()` accepts any password. There's no minimum length, complexity, or common password check.

**What to do:** Add `@Size(min = 8)` and a custom validator for complexity requirements (uppercase, lowercase, digit).

---

### 4.3 No email verification on registration

Users can register with any email — no verification step. This means:
- Typos in email go undetected
- Anyone can register with someone else's email
- Password reset (if added) would go to the wrong address

**What to do:** Add email verification flow with a confirmation token.

---

### 4.4 Missing @PreAuthorize on sensitive endpoints

Several endpoints lack role-based access control:
- `MenuItemController.createItem()` — no role check
- `InventoryController` — no role check  
- `DiningTableController` — no role check
- `AnalyticsController` — no role check

**What to do:** Add `@PreAuthorize("hasAnyRole('TENANT_ADMIN', 'SUPER_ADMIN')")` to all write/admin endpoints.

---

### 4.5 No CORS origin validation in production

`application.yml` defaults CORS to `http://localhost:5173,http://localhost:3000`. In production, this should be restricted to the actual frontend domain. The env var mechanism exists but no prod-specific default is set.

**What to do:** Set a restrictive default in `application-prod.yml` and document that `CORS_ALLOWED_ORIGINS` must be set in production.

---

### 4.6 Security headers are only in Nginx, not Spring

`frontend/nginx.conf` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and CSP. However, the Spring Boot backend doesn't set these headers — direct API calls bypass Nginx.

**What to do:** Add security headers in `SecurityConfig.java` using Spring Security's `.headers()` configuration.

---

## 5. Performance Improvements

---

### 5.1 Add menu caching (highest impact)

Menu items are the most frequently read, least frequently changed data — perfect for caching. Every public menu page load currently hits PostgreSQL.

**Impact:** For a busy restaurant with 100 concurrent menu viewers, this would reduce DB queries from 100/minute to ~1/minute.

---

### 5.2 AnalyticsService computes everything in Java

`AnalyticsService.getSummary()` loads all orders for a tenant, then uses Java streams to compute counts, revenue, and top items. For a restaurant with 10,000+ orders, this loads the entire order history into memory.

**What to do:** Use SQL aggregation queries (or the V24 views) to compute analytics in the database. Return only the computed results.

---

### 5.3 Historical prep time calculation is expensive

`computeHistoricalAveragePrepMinutes()` loads ALL order status history for a tenant, iterates through it in Java, and computes averages. This runs on EVERY order response.

**What to do:** Use the `vw_accurate_prep_times` view (already created in V24) and cache the result per tenant with a 30-minute TTL.

---

### 5.4 No database query optimization for N+1

`OrderService.toResponse()` accesses `order.getTenant()`, `order.getCustomer()`, `order.getTable()`, and `order.getItems()` — all lazy-loaded. When fetching a list of orders, this causes N+1 queries.

**What to do:** Add `@EntityGraph` annotations or use JPQL `JOIN FETCH` queries for list operations.

---

### 5.5 No pagination on MenuItemService list methods

`getItemsByCategory()` and `getItemsByTenant()` return unbounded `List<MenuItem>`. A restaurant with 500+ menu items would return everything.

**What to do:** Add `Pageable` parameter support, or at minimum ensure frontend paginates.

---

## 6. Testing Gaps

---

### 6.1 Flyway is disabled in tests — schema drift risk

Tests use `ddl-auto: create-drop` with H2 instead of Flyway with PostgreSQL. This means:
- H2's SQL dialect differs from PostgreSQL (no generated columns, no partial indexes, no triggers)
- Schema generated by Hibernate may differ from Flyway-managed production schema
- PostgreSQL-specific features (V24 generated columns, V23 partial unique indexes, V6 triggers) are untested

**What to do:** Use Testcontainers to run a real PostgreSQL instance in tests with Flyway enabled. This catches migration errors and dialect-specific bugs.

---

### 6.2 Very low coverage thresholds

- Backend: 45% line coverage, 25% branch coverage
- Frontend: 20% line coverage, 10% branch coverage

These are quite low for a production application.

**What to do:** Gradually increase thresholds as coverage improves. Target: 70% line / 50% branch for backend, 50% line / 30% branch for frontend.

---

### 6.3 No backend integration tests for core flows

Key flows like `placeOrder()`, `updateStatus()`, subscription enforcement, and tenant isolation have no integration tests that verify end-to-end behavior against a real database.

**What to do:** Add `@SpringBootTest` tests for:
- Order placement (happy path + subscription limit + closed restaurant)
- Status transitions (valid + invalid)
- Tenant isolation (cross-tenant access returns 403)
- User deletion anonymization

---

### 6.4 No WebSocket tests

WebSocket connections, STOMP subscriptions, tenant isolation on subscribe, and real-time message delivery are completely untested.

**What to do:** Add integration tests using `TestWebSocketStompClient` from Spring.

---

### 6.5 k6 tests use hardcoded IDs

Both `smoke-test.js` and `load-test.js` hardcode `TENANT_ID` and `MENU_ITEM_ID`. These will fail against any environment that doesn't have those exact UUIDs.

**What to do:** Make the k6 tests dynamic — create test data via API before running, or read from environment variables.

---

## 7. Infrastructure & DevOps Improvements

---

### 7.1 No HPA (Horizontal Pod Autoscaler) manifest

Docs mention HPA and auto-scaling based on CPU, but there is no HPA manifest in `k8s/`. The backend Deployment is fixed at 2 replicas.

**What to do:** Add `k8s/hpa.yaml`:
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: backend-hpa
  namespace: dineops
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: backend
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

---

### 7.2 No Ingress resource

The Kubernetes setup has no Ingress resource. Frontend and backend services are NodePort, which doesn't provide proper routing, TLS termination, or path-based routing.

**What to do:** Add an Ingress resource (nginx-ingress or traefik) for `/api/*` → backend, `/*` → frontend routing.

---

### 7.3 No Kubernetes NetworkPolicy

All pods in the namespace can communicate with each other. There's no network segmentation.

**What to do:** Add NetworkPolicies to restrict traffic: only backend can reach PostgreSQL and Redis, only frontend can reach backend.

---

### 7.4 Docker Compose has no resource limits

Containers in `docker-compose.yml` have no `mem_limit` or `cpus` constraints. A runaway container could consume all host resources.

**What to do:** Add `deploy.resources.limits` to each service.

---

### 7.5 No Grafana dashboard provisioning

Grafana is deployed but has no pre-configured dashboards. Users must manually create dashboards after setup.

**What to do:** Add a provisioning JSON file for a default PlatterOps dashboard (JVM metrics, HTTP latency, DB connections, cache hit rate) mounted into Grafana.

---

### 7.6 No log aggregation

Logs are only available via `docker logs` or `kubectl logs`. No centralized logging solution.

**What to do:** Add structured JSON logging (Logback JSON encoder) and ship to Loki or ELK stack. Reference the MDC `requestId` for correlation.

---

### 7.7 Database backup scripts exist but no automation

`scripts/db-backup.sh` and `scripts/db-backup.ps1` exist but are manual. No cron job, no Kubernetes CronJob, no monitoring of backup success.

**What to do:** Add a Kubernetes CronJob for automated backups, or integrate with a managed backup service.

---

## 8. Code Quality & Architecture

---

### 8.1 Entities use manual getters/setters despite Lombok being mentioned

Docs mention Lombok's `@Getter` and `@Setter` for encapsulation, but entities like `Review`, `OrderStatusHistory`, and others use manually written getters and setters. Some entities may use Lombok, creating inconsistency.

**What to do:** Standardize — either use Lombok everywhere or nowhere.

---

### 8.2 @SuppressWarnings("null") used broadly

`OrderService`, `MenuItemService`, and others use `@SuppressWarnings("null")` at the class level, which suppresses all null-related warnings. This hides potential NPE bugs.

**What to do:** Remove class-level suppression and address individual null-safety concerns with proper null checks or `Optional`.

---

### 8.3 No DTOs for request validation on several endpoints

Some request objects lack proper Bean Validation annotations. For example, `PlaceOrderRequest` should validate that `items` is not empty, `tenantId` is not null, etc.

**What to do:** Add `@NotNull`, `@NotEmpty`, `@Size`, `@Min` annotations to all request DTOs.

---

### 8.4 AOP audit logging reflection is fragile

`AuditLogAspect` uses reflection to extract `getId()` and `getTenantId()` from return values. If a method returns `void`, a primitive, or a DTO without those methods, it fails silently.

**What to do:** Define an `Auditable` interface with `getId()` and `getTenantId()` methods. Have all auditable return types implement it. Replace reflection with interface-based access.

---

### 8.5 No API versioning strategy beyond URL prefix

The API uses `/api/v1/` prefix but there's no strategy for introducing `/v2/` endpoints while maintaining backward compatibility.

**What to do:** Document the versioning strategy. Consider content negotiation or separate controller classes for future versions.

---

### 8.6 OrderService is too large

`OrderService` handles order placement, status updates, cancellation, payment initiation, payment webhooks, invoice generation, phone lookup, status history, prep time estimation, and real-time publishing — all in one 507-line class.

**What to do:** Extract into focused services:
- `OrderPlacementService` — order creation
- `OrderPaymentService` — payment initiation/webhooks
- `OrderInvoiceService` — invoice generation
- `PrepTimeEstimator` — prep time calculation

---

## 9. Frontend Improvements

---

### 9.1 No error boundary around WebSocket connections

WebSocket disconnection errors can propagate and crash the React tree. The `KitchenPage` and `OrderStatusPage` have try-catch handling, but there's no top-level error boundary for WebSocket-related crashes.

**What to do:** Wrap WebSocket-dependent pages in dedicated `ErrorBoundary` components with reconnection UI.

---

### 9.2 No offline/connection-loss handling

If the user loses internet connectivity, the app shows no indication. API calls silently fail.

**What to do:** Add a global connection status indicator and queue failed requests for retry.

---

### 9.3 No loading skeleton screens

Pages use simple "Loading..." text states. Modern UX uses skeleton screens that mimic the layout while data loads.

**What to do:** Replace `LoadingState` with skeleton components matching each page's layout.

---

### 9.4 No accessibility (a11y) implementation

No ARIA labels, no keyboard navigation support, no screen reader testing. This is a legal requirement in many jurisdictions.

**What to do:** Add proper ARIA attributes, ensure keyboard navigability, test with screen readers.

---

### 9.5 Cart doesn't validate item availability before checkout

A customer could add items to the cart, wait an hour (items go out of stock), and then place an order. The cart shows stale data.

**What to do:** Re-validate cart items against current availability when the user navigates to the confirm page.

---

### 9.6 No image optimization

`FoodItemCard` uses `<img>` tags with no lazy loading, no responsive sizing, and no fallback for broken images.

**What to do:** Add `loading="lazy"`, `srcSet` for responsive images, and a placeholder/fallback for missing images.

---

### 9.7 SuperAdminDashboardPage and TicketsPage may be empty shells

These pages exist in the routing but may lack full implementation. The super admin dashboard should consume the platform-level analytics views.

**What to do:** Verify and complete these pages with real data from the backend.

---

## 10. Feature Additions Worth Considering

---

### 10.1 Real PDF Invoice Generation

Replace the text-based invoice with a proper PDF using OpenPDF or iText. Include restaurant logo, styled table, QR code for payment, and FSSAI/GST details.

---

### 10.2 Staff Management API

`StaffController` exists but only has a POST endpoint to add staff. Missing: list staff, update staff role, deactivate staff, transfer staff between restaurants.

---

### 10.3 Table QR Code Generation

`DiningTable` has a `qr_code_url` field but no endpoint to generate QR codes. Add a QR code generation endpoint using a library like ZXing.

---

### 10.4 Forgot Password / Password Reset Flow

No password reset mechanism exists. If a user forgets their password, there's no recovery path.

---

### 10.5 Order Search and Filtering

No ability to search orders by date range, status, customer name, or amount. The only lookup is by phone number (last 10 orders).

---

### 10.6 Menu Item Image Upload

`MenuItem` has an `imageUrl` field but no image upload endpoint. Images must be hosted externally and URLs set manually.

---

### 10.7 Restaurant Onboarding Flow Completion

`RestaurantOnboardingPage` exists on the frontend, but the backend lacks a multi-step onboarding workflow (create restaurant → set operating hours → add first menu → activate subscription).

---

### 10.8 WebSocket Horizontal Scaling

The current in-memory STOMP broker doesn't work with multiple backend replicas. Messages published on one instance don't reach clients connected to another.

**What to do:** Replace `enableSimpleBroker()` with `enableStompBrokerRelay()` using RabbitMQ or Redis pub/sub as the relay.

---

### 10.9 Rate Limiting per API Endpoint

Current rate limiting only applies to login/register. High-traffic public endpoints (menu pages) have no rate limiting, making them vulnerable to abuse.

---

### 10.10 Audit Log Viewer in Frontend

`AuditLogController` exposes audit logs via API, but there's no dedicated audit log page in the dashboard for tenant admins to review actions.

---

## Summary — Priority Matrix

| Priority | Category | Item |
|----------|----------|------|
| **P0 — Fix Now** | Docs | 1.2 Menu caching claims (code doesn't match docs) |
| **P0 — Fix Now** | Docs | 1.5 Deletion grace period (7d not 30d) |
| **P0 — Fix Now** | Docs | 1.6 Flyway in tests (disabled, not running) |
| **P0 — Fix Now** | Docs | 1.7 OperatingHoursParser absent key behavior |
| **P0 — Fix Now** | Bug | 2.1 Invoice "PDF" is plain text |
| **P1 — Important** | Feature | 3.2 Add menu item caching (matches docs, improves perf) |
| **P1 — Important** | Security | 4.1 JWT token revocation |
| **P1 — Important** | Security | 4.4 Missing @PreAuthorize on endpoints |
| **P1 — Important** | Testing | 6.1 Use Testcontainers for real PostgreSQL in tests |
| **P1 — Important** | Docs | Fix all remaining doc accuracy issues (1.1, 1.3, 1.4, 1.8, 1.10, 1.12) |
| **P2 — Should Do** | Code | 8.6 Split OrderService into smaller services |
| **P2 — Should Do** | Feature | 3.3 Customer data erasure on orders |
| **P2 — Should Do** | Feature | 3.4 FSSAI food card entity mapping |
| **P2 — Should Do** | Perf | 5.2 AnalyticsService uses SQL views |
| **P2 — Should Do** | Security | 4.2 Password complexity validation |
| **P2 — Should Do** | Infra | 7.1 Add HPA manifest |
| **P3 — Nice to Have** | Feature | 10.1 Real PDF invoices |
| **P3 — Nice to Have** | Feature | 10.4 Password reset flow |
| **P3 — Nice to Have** | Frontend | 9.3 Skeleton loading screens |
| **P3 — Nice to Have** | Frontend | 9.4 Accessibility |
| **P3 — Nice to Have** | Infra | 7.5 Grafana dashboard provisioning |
| **P3 — Nice to Have** | Infra | 7.6 Log aggregation |

---

*Generated: March 2026*
*Cross-referenced against: CDAC_INTERVIEW_ANSWERS.md, CODEBASE_EXPLAINED.md, DB_VIEW.md, DEVOPS_STACK_EXPLAINED.md, JUNIOR_DEV_INTERVIEW.md, PROJECT_PITCH.md, and the full source code of backend/, frontend/, k8s/, k6/, .github/, and docker-compose.yml.*
