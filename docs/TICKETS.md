# DineOps — Production Readiness Ticket Backlog

> Generated from a full codebase audit on 2026-03-19.
> Organized by Epic → Priority (P0 = ship-blocking, P3 = nice-to-have).
> Each ticket includes branch name, commit messages, and acceptance criteria.

---

## Naming Conventions


| Item   | Pattern                           | Example                                               |
| ------ | --------------------------------- | ----------------------------------------------------- |
| Branch | `<type>/<ticket-id>-<short-desc>` | `fix/DOPS-001-restaurant-service-constructor`         |
| Commit | `<type>(scope): message`          | `fix(restaurant): correct constructor parameter type` |


Types: `fix`, `feat`, `refactor`, `chore`, `test`, `docs`, `security`, `perf`

---

## Jira Ticket Number Rule (so branch ids match your Jira keys)

Use this rule when reading `docs/TICKETS.md` vs your Jira sprint board:

- `Jira DOPS-<J>` = `docs/TICKETS.md DOPS-<D>` + `48`

Examples (from your instructions):
- `DOPS-004` in this file corresponds to Jira `DOPS-052`
- `DOPS-017` in this file corresponds to Jira `DOPS-065`

## Epic 1 — Critical Bug Fixes (P0)

### DOPS-001: Fix RestaurantService constructor type error

**Priority:** P0 — Compilation error
**Estimate:** 15 min

`RestaurantService` constructor accepts `RestaurantService` instead of `RestaurantRepository`. This prevents compilation.

```java
// Current (broken)
public RestaurantService(RestaurantService restaurantRepository)

// Expected
public RestaurantService(RestaurantRepository restaurantRepository)
```

---

## Epic 15 — Hardening Gaps From Additional Audit (P1/P2)

### DOPS-062: Fix k6 script reliability issues

**Priority:** P1  
**Estimate:** 45 min

k6 scripts have reliability issues noted in the external audit:

- duplicate `BASE_URL` declaration
- hardcoded host in smoke/load scripts instead of env-driven configuration

**Acceptance Criteria:**

- Remove duplicate `BASE_URL` declarations in k6 scripts
- Read base URL from `__ENV.K6_BASE_URL` with fallback to local default
- Update CI/Jenkins invocation docs to pass `K6_BASE_URL`
- Verify smoke and load scripts both execute without runtime var conflicts

**Branch:** `fix/DOPS-062-k6-base-url-cleanup`  
**Commits:**

- `fix(k6): remove duplicate BASE_URL declarations`
- `feat(k6): support __ENV.K6_BASE_URL with sane fallback`

---

### DOPS-063: Run backend container as non-root

**Priority:** P1  
**Estimate:** 1 hour

Backend container currently runs as root. Harden runtime privileges in `backend/Dockerfile`.

**Acceptance Criteria:**

- Create dedicated non-root user/group in runtime image
- Ensure app files are owned/readable by non-root user
- Set `USER` to non-root in final stage
- Verify app starts and health endpoint responds in Docker Compose

**Branch:** `security/DOPS-063-backend-non-root`  
**Commits:**

- `security(docker): run backend container as non-root user`

---

### DOPS-064: Harden frontend nginx configuration

**Priority:** P2  
**Estimate:** 2 hours

Frontend nginx config is inline in Dockerfile and lacks production hardening (cache/security/perf headers).

**Acceptance Criteria:**

- Extract inline nginx config into `frontend/nginx.conf`
- Enable gzip compression for text assets
- Add cache headers for immutable static assets
- Add baseline security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, CSP where feasible)
- Keep SPA fallback behavior (`try_files ... /index.html`)

**Branch:** `chore/DOPS-064-nginx-hardening`  
**Commits:**

- `chore(frontend): extract nginx config from Dockerfile into dedicated file`
- `security(nginx): add gzip, cache policy, and baseline security headers`

---

### DOPS-065: Prevent inactive users from logging in

**Priority:** P1  
**Estimate:** 1 hour

`AuthController` validates email/password but does not block inactive users.

**Acceptance Criteria:**

- Add `isActive` check before token issuance
- Return generic unauthorized response for inactive users (no user-state leakage)
- Add tests for active vs inactive login behavior

**Branch:** `security/DOPS-065-block-inactive-logins`  
**Commits:**

- `security(auth): block JWT issuance for inactive users`
- `test(auth): add coverage for inactive user login rejection`

---

### DOPS-066: Refactor BCryptPasswordEncoder into Spring bean

**Priority:** P2  
**Estimate:** 1 hour

`UserService` instantiates `new BCryptPasswordEncoder()` directly, making it harder to configure centrally.

**Acceptance Criteria:**

- Add `BCryptPasswordEncoder` as a Spring `@Bean` in security config
- Inject encoder into `UserService` via constructor
- Remove direct instantiation from service code
- Verify tests still pass with bean-based injection

**Branch:** `refactor/DOPS-066-password-encoder-bean`  
**Commits:**

- `refactor(security): configure BCryptPasswordEncoder as injectable bean`
- `refactor(user): inject password encoder into UserService`

---

### DOPS-067: Decide and implement safer token storage strategy

**Priority:** P1  
**Estimate:** 4-6 hours

JWT is currently stored in `localStorage` (XSS-exposed). Evaluate and implement hardened storage.

**Acceptance Criteria:**

- Document decision record comparing `localStorage` vs `httpOnly` cookie strategy
- If cookie strategy selected, implement secure cookie issuance and CSRF mitigation pattern
- Update frontend auth flow to cookie/session approach (no direct token persistence in localStorage)
- Validate login/logout/refresh behavior end-to-end
- Add security tests or manual checklist for XSS/CSRF implications

**Branch:** `security/DOPS-067-token-storage-hardening`  
**Commits:**

- `docs(auth): add token storage decision record with threat tradeoffs`
- `security(auth): implement hardened token storage strategy`
- `feat(frontend): update auth flow for hardened token handling`

---

### DOPS-068: Isolate test profile from development database

**Priority:** P1  
**Estimate:** 2 hours

Test profile should never point at the same database used for local development.

**Acceptance Criteria:**

- Update `application-test.yml` to avoid shared dev DB credentials/URL
- Use Testcontainers or dedicated test DB config in CI/local
- Ensure backend tests run without mutating developer local data
- Document test execution requirements in README

**Branch:** `test/DOPS-068-isolated-test-db`  
**Commits:**

- `test(config): isolate test profile from development database`
- `docs(testing): document local and CI test database setup`

---

## Quick Reference Addendum (DOPS-062 to DOPS-068)

```
fix/DOPS-062-k6-base-url-cleanup
security/DOPS-063-backend-non-root
chore/DOPS-064-nginx-hardening
security/DOPS-065-block-inactive-logins
refactor/DOPS-066-password-encoder-bean
security/DOPS-067-token-storage-hardening
test/DOPS-068-isolated-test-db
```

## Hardening Flow (DOPS-065 to DOPS-068)

Use this order because it limits risk and keeps contracts stable.

1. `DOPS-065` (Block inactive logins)
   - Backend change only (AuthController / auth logic).
   - Verify: active user login still issues JWT; inactive user gets the same generic unauthorized response.

2. `DOPS-066` (BCryptPasswordEncoder as a Spring bean)
   - Refactor only (wiring/DI), no auth behavior change expected.
   - Verify: all existing unit tests for auth/user still pass; login still works for active users.

3. `DOPS-068` (Isolate test profile from dev DB)
   - Test infra change only.
   - Verify: running backend tests does not touch your dev credentials/data and uses isolated DB (Testcontainers or dedicated test DB).

4. `DOPS-067` (Token storage hardening)
   - This is the biggest user-facing security/UX change because it affects how the frontend stores/sends auth credentials.
   - Flow:
     - Write a decision record (localStorage vs httpOnly cookie).
     - Implement backend auth changes (token issuance / endpoints / CSRF strategy if using cookies).
     - Update frontend auth flow + axios interceptors.
     - Verify end-to-end: login → authenticated API calls → logout/session expiry handling.

**Acceptance Criteria:**

- Constructor accepts `RestaurantRepository`
- `RestaurantServiceTest` compiles and passes
- Application starts without circular dependency error

**Branch:** `fix/DOPS-001-restaurant-service-constructor`
**Commits:**

- `fix(restaurant): correct constructor parameter type from RestaurantService to RestaurantRepository`

---

### DOPS-002: Fix MenuItemController variable name error

**Priority:** P0 — Compilation error
**Estimate:** 15 min

`MenuItemController.createItem()` returns `order` (undefined) instead of `item`.

```java
// Current (broken)
MenuItem item = menuItemService.createItem(tenantId, categoryId, request);
return ResponseEntity.status(201).body(order);

// Expected
return ResponseEntity.status(201).body(item);
```

**Acceptance Criteria:**

- `createItem` returns the created `MenuItem`
- POST to `/api/v1/restaurants/{tenantId}/categories/{categoryId}/items` returns 201 with item body

**Branch:** `fix/DOPS-002-menu-item-controller-return`
**Commits:**

- `fix(menu): return correct variable in MenuItemController.createItem`

---

### DOPS-003: Fix Restaurant status default mismatch

**Priority:** P0 — Data inconsistency
**Estimate:** 30 min

Migration `V1` defaults `status` to `'PENDING'`, but `Restaurant.java` defaults to `"active"`. Records created via JPA vs SQL have different statuses.

**Acceptance Criteria:**

- `Restaurant.java` default matches migration default (`PENDING`)
- Create an enum `RestaurantStatus` (PENDING, ACTIVE, SUSPENDED, CLOSED)
- Add Flyway migration V5 to align existing data
- Use `@Enumerated(EnumType.STRING)` on the field

**Branch:** `fix/DOPS-003-restaurant-status-enum`
**Commits:**

- `fix(restaurant): create RestaurantStatus enum and align defaults with migration`
- `feat(migration): add V5 migration to standardize restaurant status values`

---

## Epic 2 — Security Hardening (P0)

### DOPS-004: Hide password hash from API responses

**Priority:** P0 — Critical data leak
**Estimate:** 1 hour

`User.passwordHash` is serialized in JSON responses wherever `User` appears (e.g., `Order.customer`). Anyone querying an order sees the BCrypt hash.

**Acceptance Criteria:**

- Add `@JsonIgnore` on `passwordHash` field
- Alternatively, introduce `UserDTO` without sensitive fields and use it in all API responses
- Verify no endpoint returns `passwordHash` (write a test)

**Branch:** `security/DOPS-004-hide-password-hash`
**Commits:**

- `security(user): add @JsonIgnore on passwordHash to prevent serialization`
- `test(user): verify password hash is never exposed in API responses`

---

### DOPS-005: Externalize all secrets and credentials

**Priority:** P0 — Secrets in source control
**Estimate:** 2 hours

Hardcoded in `application.yml` and `docker-compose.yml`:

- DB password: `dineops123`
- JWT secret: `dineops-super-secret-key-change-this-in-production-min-32-chars`
- Grafana password: `dineops123`

**Acceptance Criteria:**

- Create `.env.example` with all required variables (no real values)
- `application.yml` reads from env vars: `${DB_PASSWORD}`, `${JWT_SECRET}`, etc.
- `docker-compose.yml` uses `env_file: .env`
- `.env` is in `.gitignore`
- Create `application-prod.yml` with production-appropriate settings
- JWT secret must be at least 256-bit random (not human-readable)

**Branch:** `security/DOPS-005-externalize-secrets`
**Commits:**

- `security(config): externalize database and JWT secrets to environment variables`
- `chore: add .env.example with all required environment variables`
- `chore(config): create application-prod.yml for production profile`

---

### DOPS-006: Enforce tenant isolation (fix IDOR vulnerability)

**Priority:** P0 — Authorization bypass
**Estimate:** 4 hours

Any authenticated user can access any tenant's data by changing `tenantId` in the URL or query params. The JWT contains `tenantId` but it's never validated against the request.

**Acceptance Criteria:**

- Create `TenantContext` utility that extracts `tenantId` from JWT claims
- Create `TenantAuthorizationFilter` that runs after `JwtAuthFilter`
- For SUPER_ADMIN: allow access to all tenants
- For TENANT_ADMIN/STAFF: reject requests where URL `tenantId` != JWT `tenantId`
- All service methods that accept `tenantId` validate against the authenticated tenant
- Write integration tests proving cross-tenant access is denied

**Branch:** `security/DOPS-006-tenant-isolation`
**Commits:**

- `feat(auth): add TenantContext to extract tenant from JWT claims`
- `security(auth): add TenantAuthorizationFilter to enforce tenant isolation`
- `test(auth): add integration tests for cross-tenant access denial`

---

### DOPS-007: Restrict actuator and Swagger endpoints

**Priority:** P0 — Information disclosure
**Estimate:** 1 hour

`/actuator/health` with `show-details: always` exposes DB status, disk space, Redis connectivity to anonymous users. Swagger UI is publicly accessible.

**Acceptance Criteria:**

- Change `show-details: when_authorized` (or `never` in prod)
- Restrict `/actuator/`** to authenticated users with SUPER_ADMIN role (except `/actuator/health` basic)
- Disable Swagger UI in production profile (`springdoc.swagger-ui.enabled=false`)
- Keep Prometheus endpoint accessible only from internal network (or with auth)

**Branch:** `security/DOPS-007-restrict-actuator-swagger`
**Commits:**

- `security(config): restrict actuator health details and Swagger access in production`

---

### DOPS-008: Add rate limiting on public endpoints

**Priority:** P0 — Abuse prevention
**Estimate:** 4 hours

`POST /api/v1/orders` and `POST /api/v1/auth/login` are public with no rate limiting. A bot can flood fake orders or brute-force passwords.

**Acceptance Criteria:**

- Add Bucket4j or Spring Cloud Gateway rate limiter backed by Redis
- Login: max 5 attempts per email per 15 minutes
- Order placement: max 10 orders per IP per 15 minutes
- Return 429 Too Many Requests with `Retry-After` header
- Write tests verifying rate limits are enforced

**Branch:** `security/DOPS-008-rate-limiting`
**Commits:**

- `feat(security): add Redis-backed rate limiting on login and order endpoints`
- `test(security): verify rate limiting returns 429 on excessive requests`

---

### DOPS-009: Add security response headers

**Priority:** P0 — Defense in depth
**Estimate:** 1 hour

No security headers are set: no CSP, X-Frame-Options, X-Content-Type-Options, Strict-Transport-Security.

**Acceptance Criteria:**

- Add headers via `SecurityConfig` or a response filter:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 0` (rely on CSP instead)
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `Content-Security-Policy: default-src 'self'`
- Verify headers appear in responses

**Branch:** `security/DOPS-009-security-headers`
**Commits:**

- `security(config): add security response headers (CSP, HSTS, X-Frame-Options)`

---

### DOPS-010: Add account lockout on failed login attempts

**Priority:** P0 — Brute force protection
**Estimate:** 3 hours

No tracking of failed login attempts. Attackers can brute-force passwords indefinitely.

**Acceptance Criteria:**

- Track failed login attempts per email in Redis (TTL-based)
- Lock account after 5 failed attempts for 15 minutes
- Return generic "Invalid credentials" (don't reveal lockout to prevent enumeration)
- Log lockout events for monitoring
- SUPER_ADMIN can unlock accounts manually

**Branch:** `security/DOPS-010-account-lockout`
**Commits:**

- `feat(auth): add Redis-backed account lockout after 5 failed login attempts`
- `test(auth): verify account lockout behavior and auto-unlock after TTL`

---

## Epic 3 — Backend Core Improvements (P1)

### DOPS-011: Add global exception handler (@ControllerAdvice)

**Priority:** P1
**Estimate:** 3 hours

All services throw raw `RuntimeException`. Clients receive 500 with stack traces. No structured error responses.

**Acceptance Criteria:**

- Create `GlobalExceptionHandler` with `@ControllerAdvice`
- Create `ApiError` record: `{ status, message, timestamp, path }`
- Handle: `EntityNotFoundException` → 404, `IllegalArgumentException` → 400, `AccessDeniedException` → 403, `MethodArgumentNotValidException` → 422, `Exception` → 500
- Replace all `RuntimeException("... not found")` with `EntityNotFoundException`
- Stack traces never reach the client
- Log full stack traces server-side at ERROR level

**Branch:** `feat/DOPS-011-global-exception-handler`
**Commits:**

- `feat(core): add GlobalExceptionHandler with structured ApiError responses`
- `refactor(services): replace RuntimeException with domain-specific exceptions`

---

### DOPS-012: Add Bean Validation to all request DTOs

**Priority:** P1
**Estimate:** 2 hours

No request bodies are validated despite `spring-boot-starter-validation` being present.

**Acceptance Criteria:**

- `LoginRequest`: `@NotBlank email`, `@NotBlank password`
- `PlaceOrderRequest`: `@NotNull tenantId`, `@NotEmpty items`, `@Min(1) quantity`
- `CreateMenuItemRequest`: `@NotBlank name`, `@NotNull @Min(0) price`
- Category creation: `@NotBlank name`
- Add `@Valid` annotation on all `@RequestBody` parameters in controllers
- `GlobalExceptionHandler` returns 422 with field-level error messages

**Branch:** `feat/DOPS-012-request-validation`
**Commits:**

- `feat(validation): add Bean Validation annotations to all request DTOs`
- `feat(controllers): add @Valid to all @RequestBody parameters`

---

### DOPS-013: Add pagination to all list endpoints

**Priority:** P1
**Estimate:** 3 hours

All list endpoints return unbounded results. 10,000 orders would crash the kitchen view.

**Acceptance Criteria:**

- `GET /api/v1/orders?tenantId=xxx` → paginated (default 20, max 100)
- `GET /api/v1/restaurants` → paginated
- `GET /api/v1/orders/active?tenantId=xxx` → paginated (or capped at 50)
- Response includes `totalElements`, `totalPages`, `page`, `size`
- Use Spring Data `Pageable` parameter
- Frontend updated to handle paginated responses

**Branch:** `feat/DOPS-013-pagination`
**Commits:**

- `feat(core): add pagination support to all list endpoints`
- `feat(frontend): update API layer and components for paginated responses`

---

### DOPS-014: Implement Redis caching

**Priority:** P1
**Estimate:** 4 hours

Redis is configured but completely unused. Menu data is fetched from Postgres on every request.

**Acceptance Criteria:**

- Add `@EnableCaching` and `RedisCacheConfiguration`
- Cache menu categories by tenant (TTL 5 min): `@Cacheable("menuCategories")`
- Cache menu items by category (TTL 5 min): `@Cacheable("menuItems")`
- Cache restaurant list (TTL 10 min): `@Cacheable("restaurants")`
- Evict on create/update/delete: `@CacheEvict`
- Verify cache hit/miss via Prometheus metrics

**Branch:** `feat/DOPS-014-redis-caching`
**Commits:**

- `feat(cache): implement Redis caching for menu and restaurant data`
- `feat(cache): add cache eviction on menu and restaurant mutations`

---

### DOPS-015: Add JPA auditing for timestamps

**Priority:** P1
**Estimate:** 1 hour

`created_at` and `updated_at` are managed manually and inconsistently. Some updates don't touch `updatedAt`.

**Acceptance Criteria:**

- Create `@MappedSuperclass AuditableEntity` with `@CreatedDate` and `@LastModifiedDate`
- Add `@EnableJpaAuditing` to a config class
- All entities extend `AuditableEntity`
- Remove manual `LocalDateTime.now()` assignments
- Add PostgreSQL trigger as a safety net via migration

**Branch:** `feat/DOPS-015-jpa-auditing`
**Commits:**

- `feat(core): add AuditableEntity base class with @CreatedDate/@LastModifiedDate`
- `refactor(entities): extend AuditableEntity and remove manual timestamp management`

---

### DOPS-016: Introduce response DTOs (decouple entities from API)

**Priority:** P1
**Estimate:** 4 hours

JPA entities are serialized directly as API responses. This leaks internal structure, lazy-loading proxies, and sensitive fields.

**Acceptance Criteria:**

- Create DTOs: `RestaurantResponse`, `MenuCategoryResponse`, `MenuItemResponse`, `OrderResponse`, `OrderItemResponse`, `UserResponse`
- Map entities → DTOs in service layer (or use MapStruct)
- No JPA entity is directly returned from any controller
- Remove all `@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})` hacks
- DTOs include only fields needed by the client

**Branch:** `refactor/DOPS-016-response-dtos`
**Commits:**

- `refactor(api): introduce response DTOs to decouple entities from API surface`
- `refactor(services): map entities to DTOs in service layer`

---

### DOPS-017: Add structured logging configuration

**Priority:** P1
**Estimate:** 2 hours

No logging configuration. `show-sql: true` will flood production logs. No structured format for log aggregation.

**Acceptance Criteria:**

- Add `logback-spring.xml` with JSON output for production profile
- Include MDC fields: `tenantId`, `userId`, `requestId`
- Disable `show-sql` in production
- Log request/response at INFO (method, path, status, duration)
- Log business events: order placed, status changed, login success/failure
- Add correlation ID (request ID) via filter

**Branch:** `feat/DOPS-017-structured-logging`
**Commits:**

- `feat(logging): add logback-spring.xml with JSON structured logging for production`
- `feat(logging): add MDC request filter for tenantId, userId, requestId correlation`

---

### DOPS-018: Add order status transition validation

**Priority:** P1
**Estimate:** 2 hours

`OrderService.updateStatus()` allows any status transition (e.g., DELIVERED → PENDING). No state machine enforcement.

**Acceptance Criteria:**

- Define allowed transitions: PENDING→CONFIRMED, CONFIRMED→PREPARING, PREPARING→READY, READY→DELIVERED, any→CANCELLED
- Reject invalid transitions with 400 and clear error message
- Write unit tests for every valid and invalid transition
- Log every status change with old/new status

**Branch:** `feat/DOPS-018-order-status-validation`
**Commits:**

- `feat(order): add state machine validation for order status transitions`
- `test(order): add unit tests for valid and invalid status transitions`

---

## Epic 4 — Authentication & User Management (P1)

### DOPS-019: Add user registration endpoint

**Priority:** P1
**Estimate:** 4 hours

`UserService.createUser()` exists but no API endpoint calls it. Users must be inserted manually into the DB.

**Acceptance Criteria:**

- `POST /api/v1/auth/register` — for CUSTOMER self-registration
- `POST /api/v1/restaurants/{tenantId}/staff` — for TENANT_ADMIN to invite STAFF (protected)
- Registration request: `name, email, password, phone`
- Validate: email format, password strength (min 8 chars, mixed case), unique email
- Return 201 with user info (no password hash)
- Add duplicate email handling (409 Conflict)

**Branch:** `feat/DOPS-019-user-registration`
**Commits:**

- `feat(auth): add customer self-registration endpoint`
- `feat(restaurant): add staff invitation endpoint for tenant admins`
- `test(auth): add registration tests for validation and duplicate email handling`

---

### DOPS-020: Add JWT refresh token mechanism

**Priority:** P1
**Estimate:** 4 hours

JWT expires after 24h with no refresh. Users are silently logged out and must re-enter credentials.

**Acceptance Criteria:**

- Reduce access token TTL to 15 minutes
- Issue a refresh token (stored in Redis, TTL 7 days) alongside access token
- `POST /api/v1/auth/refresh` — accepts refresh token, returns new access token
- Refresh tokens are single-use (rotated on each refresh)
- `POST /api/v1/auth/logout` — invalidates refresh token in Redis
- Frontend axios interceptor auto-refreshes on 401

**Branch:** `feat/DOPS-020-jwt-refresh-token`
**Commits:**

- `feat(auth): implement refresh token with Redis storage and rotation`
- `feat(auth): add /refresh and /logout endpoints`
- `feat(frontend): add axios interceptor for automatic token refresh on 401`

---

### DOPS-021: Build restaurant onboarding flow

**Priority:** P1
**Estimate:** 6 hours

No way for a restaurant owner to sign up, create a restaurant, and set up their menu through the UI.

**Acceptance Criteria:**

- `POST /api/v1/restaurants` — create restaurant (authenticated, role check)
- Multi-step onboarding wizard on frontend:
  1. Register as TENANT_ADMIN (or login)
  2. Enter restaurant details (name, address, phone, cuisine type)
  3. Auto-generate slug from name
  4. Link user to restaurant as TENANT_ADMIN
  5. Redirect to menu setup
- Validate slug uniqueness
- SUPER_ADMIN can also create restaurants on behalf of owners

**Branch:** `feat/DOPS-021-restaurant-onboarding`
**Commits:**

- `feat(restaurant): add create/update restaurant endpoints with slug generation`
- `feat(frontend): build multi-step restaurant onboarding wizard`
- `test(restaurant): add onboarding flow integration tests`

---

### DOPS-022: Resolve hardcoded tenant IDs on frontend

**Priority:** P1
**Estimate:** 3 hours

`MenuPage.tsx` and `KitchenPage.tsx` use hardcoded UUID `a085284e-ca00-4f64-a2c7-42fc0572bb97`. Dashboard only works for one restaurant.

**Acceptance Criteria:**

- Create `AuthContext` that decodes JWT and provides `tenantId`, `role`, `userId`
- `MenuPage` and `KitchenPage` read `tenantId` from `AuthContext`
- `DashboardLayout` shows restaurant name from context
- If user has no `tenantId` (SUPER_ADMIN), show restaurant selector
- Remove all hardcoded UUIDs from frontend code

**Branch:** `feat/DOPS-022-frontend-auth-context`
**Commits:**

- `feat(frontend): add AuthContext with JWT decoding for tenantId, role, userId`
- `refactor(frontend): replace all hardcoded tenant IDs with AuthContext`

---

## Epic 5 — Payment & Financial (P1)

### DOPS-023: Add payment integration (Razorpay/Stripe)

**Priority:** P1
**Estimate:** 8 hours

No payment capability exists. Orders are placed with no payment.

**Acceptance Criteria:**

- Add `payment_status` field to orders: UNPAID, PENDING, PAID, FAILED, REFUNDED
- Add `payment_method` field: CASH, UPI, CARD, ONLINE
- Integrate Razorpay (or Stripe) for online payments
- `POST /api/v1/orders/{orderId}/pay` — initiate payment
- Webhook handler for payment confirmation
- Frontend payment flow on `OrderConfirmPage`
- Support "Pay at Counter" (cash) option

**Branch:** `feat/DOPS-023-payment-integration`
**Commits:**

- `feat(order): add payment_status and payment_method fields with migration`
- `feat(payment): integrate Razorpay payment gateway`
- `feat(frontend): add payment selection and Razorpay checkout on order confirmation`

---

### DOPS-024: Add GST/tax calculation and invoicing

**Priority:** P1
**Estimate:** 6 hours

No tax handling. Indian restaurants must charge GST (5% or 18%).

**Acceptance Criteria:**

- Add `gst_number` and `gst_rate` fields to `restaurants` table
- Add `tax_amount`, `subtotal`, `discount_amount` fields to `orders` table
- Calculate tax at order placement time
- Generate PDF invoice for each order
- `GET /api/v1/orders/{orderId}/invoice` — download invoice
- Invoice includes: restaurant name, FSSAI, GST number, itemized list, tax breakdown

**Branch:** `feat/DOPS-024-gst-invoicing`
**Commits:**

- `feat(restaurant): add GST number and FSSAI license fields`
- `feat(order): add tax calculation with subtotal, tax_amount, discount_amount`
- `feat(invoice): add PDF invoice generation for orders`

---

## Epic 6 — Frontend Improvements (P1)

### DOPS-025: Clean up boilerplate and fix layouts

**Priority:** P1
**Estimate:** 2 hours

`App.css` contains Vite boilerplate (`.logo`, `.card`, `logo-spin`) that interferes with layouts. `PublicLayout` centers everything including the menu page.

**Acceptance Criteria:**

- Delete all content from `App.css` (or delete the file and remove import)
- `PublicLayout` uses `min-h-screen bg-gray-50` without forced centering
- `LoginPage` handles its own centering internally
- Menu pages use full width on mobile
- Verify no visual regressions on all routes

**Branch:** `refactor/DOPS-025-cleanup-layouts`
**Commits:**

- `refactor(frontend): remove Vite boilerplate CSS and fix PublicLayout centering`

---

### DOPS-026: Add TypeScript interfaces for API entities

**Priority:** P1
**Estimate:** 2 hours

No type definitions for API responses. Everything is implicitly `any`.

**Acceptance Criteria:**

- Create `src/types/` directory with:
  - `restaurant.ts`: `Restaurant`, `RestaurantStatus`
  - `menu.ts`: `MenuCategory`, `MenuItem`
  - `order.ts`: `Order`, `OrderItem`, `OrderStatus`
  - `user.ts`: `User`, `UserRole`
  - `api.ts`: `PaginatedResponse<T>`, `ApiError`
- All API functions return typed responses
- All components use typed props
- No `any` types in the codebase

**Branch:** `feat/DOPS-026-typescript-interfaces`
**Commits:**

- `feat(frontend): add TypeScript interfaces for all API entities`
- `refactor(frontend): apply type annotations across all API calls and components`

---

### DOPS-027: Add API base URL environment variable

**Priority:** P1
**Estimate:** 30 min

`axiosInstance` hardcodes `http://localhost:8080`. Won't work in Docker or production.

**Acceptance Criteria:**

- Use `import.meta.env.VITE_API_URL` as `baseURL`
- Add `.env.development` with `VITE_API_URL=http://localhost:8080`
- Add `.env.production` with `VITE_API_URL=/api` (or appropriate production URL)
- Add `.env.example` documenting all env vars
- Update frontend Dockerfile to accept build args

**Branch:** `feat/DOPS-027-api-base-url-env`
**Commits:**

- `feat(frontend): use VITE_API_URL environment variable for API base URL`

---

### DOPS-028: Add axios 401 interceptor and error handling

**Priority:** P1
**Estimate:** 2 hours

No global error handling. Expired tokens cause silent failures. No toast notifications.

**Acceptance Criteria:**

- Add response interceptor: on 401, clear token, redirect to `/login`
- Add global toast notification system (react-hot-toast or sonner)
- On 500: show "Something went wrong" toast
- On 429: show "Too many requests, please wait" toast
- On network error: show "Connection lost" toast
- Remove per-component `catch` blocks where generic handling suffices

**Branch:** `feat/DOPS-028-global-error-handling`
**Commits:**

- `feat(frontend): add axios response interceptor for 401 auto-logout`
- `feat(frontend): add global toast notification system for API errors`

---

### DOPS-029: Add loading skeletons and empty states

**Priority:** P1
**Estimate:** 3 hours

Pages show nothing during loading and blank space when data is empty.

**Acceptance Criteria:**

- Create `Skeleton` component (animated placeholder)
- Add loading skeletons to: RestaurantsPage, MenuPage, KitchenPage, PublicMenuPage
- Add empty states with illustration/message:
  - "No restaurants yet" → "Create your first restaurant"
  - "No menu categories" → "Add a category to get started"
  - "No orders yet" → "Orders will appear here"
- Add error states: "Failed to load. Tap to retry."

**Branch:** `feat/DOPS-029-loading-empty-states`
**Commits:**

- `feat(frontend): add Skeleton component and loading states for all pages`
- `feat(frontend): add empty state illustrations and retry-on-error states`

---

### DOPS-030: Add proper icon library and 404 page

**Priority:** P1
**Estimate:** 2 hours

Dashboard nav uses emoji icons. No 404 page exists — all unknown routes redirect to login.

**Acceptance Criteria:**

- Install Lucide React (`lucide-react`)
- Replace all emoji icons in `DashboardLayout` with Lucide icons
- Create `NotFoundPage` component with "Page not found" message and "Go Home" button
- Route `*` under `PublicLayout` shows `NotFoundPage`
- Route `*` under `DashboardLayout` shows dashboard-specific "Not Found"

**Branch:** `feat/DOPS-030-icons-and-404`
**Commits:**

- `feat(frontend): replace emoji nav icons with Lucide React icons`
- `feat(frontend): add 404 NotFound page for public and dashboard routes`

---

### DOPS-031: Add React Error Boundaries

**Priority:** P1
**Estimate:** 1 hour

A runtime error in any component crashes the entire app with a white screen.

**Acceptance Criteria:**

- Create `ErrorBoundary` component with "Something went wrong" fallback UI
- Wrap `DashboardLayout` and `PublicLayout` content with `ErrorBoundary`
- Include "Reload" button and optional error details in development
- Log errors to console (and later to a service like Sentry)

**Branch:** `feat/DOPS-031-error-boundaries`
**Commits:**

- `feat(frontend): add ErrorBoundary component wrapping layout content areas`

---

## Epic 7 — Real-time & Notifications (P2)

### DOPS-032: Add WebSocket for real-time order updates

**Priority:** P2
**Estimate:** 6 hours

Kitchen view and customer order status use polling (15s/10s). This misses updates and wastes bandwidth.

**Acceptance Criteria:**

- Add Spring WebSocket (STOMP over SockJS) dependency
- Topic: `/topic/orders/{tenantId}` — broadcasts order updates to kitchen
- Topic: `/topic/order/{orderId}` — broadcasts status changes to customer
- `OrderService.updateStatus()` publishes to WebSocket topic
- Frontend `KitchenPage` subscribes instead of polling
- Frontend `OrderStatusPage` subscribes instead of polling
- Fallback to polling if WebSocket connection fails

**Branch:** `feat/DOPS-032-websocket-orders`
**Commits:**

- `feat(backend): add WebSocket STOMP support for real-time order updates`
- `feat(frontend): replace polling with WebSocket subscription on kitchen and order pages`

---

### DOPS-033: Add notification system (SMS/email)

**Priority:** P2
**Estimate:** 6 hours

No notification when order is placed, confirmed, or ready. Customers lose their order ID if they close the browser.

**Acceptance Criteria:**

- Add email notifications via SendGrid/SMTP:
  - Order confirmation (to customer, if email provided)
  - Order ready (to customer)
- Add SMS notifications via Twilio/MSG91 (optional):
  - Order ready (to customer phone)
- Add phone/email fields to order placement (optional)
- Use async processing (`@Async` or message queue) to avoid blocking order placement
- Configuration to enable/disable per restaurant

**Branch:** `feat/DOPS-033-notifications`
**Commits:**

- `feat(notification): add email notification service with SendGrid integration`
- `feat(order): send order confirmation and ready notifications`
- `feat(config): add per-restaurant notification preferences`

---

## Epic 8 — Data & Analytics (P2)

### DOPS-034: Add order status history tracking

**Priority:** P2
**Estimate:** 3 hours

No record of when status changes happened. Cannot calculate preparation time or identify bottlenecks.

**Acceptance Criteria:**

- Create `order_status_history` table: `(id, order_id, old_status, new_status, changed_by, changed_at)`
- Flyway migration for the new table
- `OrderService.updateStatus()` inserts a history record
- `GET /api/v1/orders/{orderId}/history` — returns status timeline
- Frontend `OrderStatusPage` shows timeline with timestamps

**Branch:** `feat/DOPS-034-order-status-history`
**Commits:**

- `feat(order): add order_status_history table and tracking on status changes`
- `feat(frontend): display order status timeline on order tracking page`

---

### DOPS-035: Add audit log for all entity changes

**Priority:** P2
**Estimate:** 4 hours

No record of who changed what and when. Needed for dispute resolution and compliance.

**Acceptance Criteria:**

- Create `audit_log` table: `(id, entity_type, entity_id, action, old_value, new_value, performed_by, tenant_id, created_at)`
- Create `@AuditLog` annotation and AOP aspect to intercept service methods
- Log: menu item created/updated/deleted, category changes, order status changes, user changes
- `GET /api/v1/audit-log?tenantId=xxx` — SUPER_ADMIN and TENANT_ADMIN only
- Store old/new values as JSON diff

**Branch:** `feat/DOPS-035-audit-log`
**Commits:**

- `feat(audit): add audit_log table and AOP-based change tracking`
- `feat(audit): add audit log query endpoint for admins`

---

### DOPS-036: Add tenant admin analytics dashboard

**Priority:** P2
**Estimate:** 6 hours

`DashboardHome` is a blank page. Restaurant owners need key metrics.

**Acceptance Criteria:**

- `GET /api/v1/analytics/summary?tenantId=xxx` returns:
  - Today's order count, revenue, average order value
  - Orders by status (pie chart data)
  - Revenue trend (last 7 days)
  - Top 5 menu items by order count
  - Average preparation time (from status history)
- Frontend dashboard with charts (use Recharts or Chart.js)
- TENANT_ADMIN and SUPER_ADMIN access only

**Branch:** `feat/DOPS-036-analytics-dashboard`
**Commits:**

- `feat(analytics): add summary analytics endpoint with revenue and order metrics`
- `feat(frontend): build analytics dashboard with charts for restaurant owners`

---

## Epic 9 — DevOps & Infrastructure (P2)

### DOPS-037: Add frontend to docker-compose and complete K8s manifests

**Priority:** P2
**Estimate:** 3 hours

Frontend service is missing from `docker-compose.yml`. K8s has no backend deployment.

**Acceptance Criteria:**

- Add `frontend` service to `docker-compose.yml` (build from `./frontend`, port 3000→80)
- Add reverse proxy (nginx or Traefik) for routing `/api` to backend, `/` to frontend
- Create `k8s/backend.yaml` with Deployment, Service, and ConfigMap
- Add readiness/liveness probes to all K8s deployments (`/actuator/health`)
- Add resource requests/limits to all K8s pods
- Update README with full `docker compose up` instructions

**Branch:** `chore/DOPS-037-complete-docker-k8s`
**Commits:**

- `chore(docker): add frontend service and nginx reverse proxy to docker-compose`
- `chore(k8s): add backend deployment with probes and resource limits`
- `docs: update README with complete local development setup`

---

### DOPS-038: Add resource limits and production Docker config

**Priority:** P2
**Estimate:** 2 hours

No memory/CPU limits. A runaway process can OOM the host.

**Acceptance Criteria:**

- Add `deploy.resources.limits` to all Docker Compose services
- Backend: 512MB–1GB RAM, 1 CPU
- Postgres: 256MB–512MB RAM
- Redis: 128MB–256MB RAM
- Frontend: 128MB RAM
- Add JVM memory flags to backend Dockerfile: `-Xms256m -Xmx512m`
- Add graceful shutdown: `spring.lifecycle.timeout-per-shutdown-phase=30s`

**Branch:** `chore/DOPS-038-resource-limits`
**Commits:**

- `chore(docker): add resource limits to all Docker Compose services`
- `chore(backend): add JVM memory flags and graceful shutdown configuration`

---

### DOPS-039: Add database backup strategy

**Priority:** P2
**Estimate:** 3 hours

`postgres_data` Docker volume has no backup. Data loss on volume deletion is permanent.

**Acceptance Criteria:**

- Add `pg_dump` cron job container to docker-compose (or script)
- Daily backups to local `./backups/` directory with 7-day retention
- For production: configure WAL archiving for point-in-time recovery
- Add backup verification (restore to temp DB and check)
- Document backup/restore procedure in `docs/operations.md`

**Branch:** `chore/DOPS-039-database-backup`
**Commits:**

- `chore(infra): add automated PostgreSQL backup with 7-day retention`
- `docs: add backup and restore operations guide`

---

### DOPS-040: Add CI pipeline for frontend and Docker builds

**Priority:** P2
**Estimate:** 3 hours

CI only runs backend tests. No frontend lint/test/build verification. No Docker image builds.

**Acceptance Criteria:**

- Add frontend job to `ci.yml`: `npm ci`, `npm run lint`, `npm run test`, `npm run build`
- Add Docker build job: build backend and frontend images (no push)
- Add branch protection: require all CI checks to pass before merge
- Cache npm and Maven dependencies across runs
- Add coverage reporting (JaCoCo → PR comment, Vitest → PR comment)

**Branch:** `chore/DOPS-040-frontend-ci`
**Commits:**

- `chore(ci): add frontend lint, test, and build jobs to GitHub Actions`
- `chore(ci): add Docker image build verification to CI pipeline`

---

### DOPS-041: Add CORS configuration for production

**Priority:** P2
**Estimate:** 1 hour

CORS only allows `localhost:5173` and `localhost:3000`. Production domains will be blocked.

**Acceptance Criteria:**

- Move allowed origins to `application.yml` as a configurable list
- Override via environment variable: `APP_CORS_ALLOWED_ORIGINS`
- Production config allows the actual domain(s)
- Verify CORS preflight works for all methods (GET, POST, PUT, PATCH, DELETE, OPTIONS)

**Branch:** `feat/DOPS-041-configurable-cors`
**Commits:**

- `feat(config): make CORS allowed origins configurable via environment variables`

---

### DOPS-042: Configure HikariCP connection pool

**Priority:** P2
**Estimate:** 1 hour

Default HikariCP settings (pool size 10, 30s timeout) may be insufficient under load.

**Acceptance Criteria:**

- Add HikariCP config to `application.yml`:
  - `maximum-pool-size: 20`
  - `minimum-idle: 5`
  - `connection-timeout: 20000`
  - `idle-timeout: 300000`
  - `max-lifetime: 1200000`
  - `leak-detection-threshold: 60000`
- Expose HikariCP metrics to Prometheus
- Add Grafana dashboard for connection pool monitoring

**Branch:** `chore/DOPS-042-hikaricp-config`
**Commits:**

- `chore(config): configure HikariCP connection pool with monitoring`

---

## Epic 10 — Testing & Quality (P2)

### DOPS-043: Add integration tests with Testcontainers

**Priority:** P2
**Estimate:** 6 hours

No integration tests. Unit tests mock everything — real DB/Redis interactions are untested.

**Acceptance Criteria:**

- Add Testcontainers dependency (Postgres, Redis)
- Create `@IntegrationTest` annotation with shared container setup
- Write integration tests for:
  - `POST /api/v1/auth/login` — success, wrong password, unknown email
  - `POST /api/v1/orders` — place order, invalid items, empty cart
  - `GET /api/v1/restaurants/{tenantId}/categories` — returns tenant's categories
  - `PATCH /api/v1/orders/{id}/status` — valid and invalid transitions
- Flyway migrations run against the test container
- Tests use real HTTP requests (`@SpringBootTest(webEnvironment = RANDOM_PORT)`)

**Branch:** `test/DOPS-043-integration-tests`
**Commits:**

- `test(infra): add Testcontainers setup for Postgres and Redis`
- `test(auth): add login integration tests`
- `test(order): add order placement and status update integration tests`
- `test(menu): add menu category and item integration tests`

---

### DOPS-044: Add unit tests for all services

**Priority:** P2
**Estimate:** 4 hours

Only `UserService` has meaningful tests. `OrderService`, `MenuItemService`, `MenuCategoryService`, `JwtUtils` have zero coverage.

**Acceptance Criteria:**

- `OrderServiceTest`: placeOrder (happy path, empty items, invalid item, unavailable item), updateStatus (valid/invalid), getActiveOrders
- `MenuItemServiceTest`: createItem, deleteItem (soft delete), getItemsByCategory
- `MenuCategoryServiceTest`: createCategory, deleteCategory, getCategoriesByTenant
- `JwtUtilsTest`: generateToken, parseToken, validateToken (expired, tampered, valid)
- `AuthControllerTest`: login success, wrong password, unknown email
- Delete `SecurityConfigTest` (the `assertTrue(true)` test)
- Minimum 70% line coverage on service and auth packages

**Branch:** `test/DOPS-044-service-unit-tests`
**Commits:**

- `test(order): add comprehensive OrderService unit tests`
- `test(menu): add MenuItemService and MenuCategoryService unit tests`
- `test(auth): add JwtUtils and AuthController unit tests`
- `chore(test): remove dummy SecurityConfigTest`

---

### DOPS-045: Add E2E tests with Playwright

**Priority:** P2
**Estimate:** 6 hours

README mentions Selenium but no E2E tests exist. Critical user journeys are untested end-to-end.

**Acceptance Criteria:**

- Set up Playwright with TypeScript
- E2E tests for:
  - Login → Dashboard → Navigate sidebar
  - Public menu → Add items to cart → Place order → Track status
  - Kitchen view → Update order status
  - Login with wrong credentials → error message
- Run in CI against Docker Compose stack
- Screenshots on failure for debugging

**Branch:** `test/DOPS-045-e2e-playwright`
**Commits:**

- `test(e2e): set up Playwright with project configuration`
- `test(e2e): add login and dashboard navigation E2E tests`
- `test(e2e): add order placement and tracking E2E tests`
- `chore(ci): add E2E test job to GitHub Actions with Docker Compose`

---

### DOPS-046: Add frontend component tests

**Priority:** P2
**Estimate:** 4 hours

Only `LoginPage` and `ProtectedRoute` have tests. All dashboard and menu pages are untested.

**Acceptance Criteria:**

- `RestaurantsPage.test.tsx`: renders restaurant cards, handles loading and error
- `KitchenPage.test.tsx`: renders kanban columns, status update buttons
- `PublicMenuPage.test.tsx`: renders categories, add to cart, cart total
- `OrderConfirmPage.test.tsx`: renders bill summary, place order
- `cartStore.test.ts`: all cart operations, tenant isolation, edge cases
- Mock API calls with MSW (Mock Service Worker)

**Branch:** `test/DOPS-046-frontend-component-tests`
**Commits:**

- `test(frontend): add component tests for dashboard pages with MSW`
- `test(frontend): add component tests for public menu and order flow`
- `test(frontend): add cartStore unit tests`

---

### DOPS-047: Set up coverage thresholds in CI

**Priority:** P2
**Estimate:** 1 hour

No coverage enforcement. Tests can be added without actually improving coverage.

**Acceptance Criteria:**

- JaCoCo: fail build below 60% line coverage (backend)
- Vitest: fail build below 50% line coverage (frontend)
- Exclude from coverage: DTOs, entities (getters/setters), config classes
- Report coverage in PR comments (GitHub Actions summary)
- SonarCloud quality gate: no new bugs, no new vulnerabilities, coverage >= 60%

**Branch:** `chore/DOPS-047-coverage-thresholds`
**Commits:**

- `chore(ci): add coverage thresholds and PR reporting for backend and frontend`

---

## Epic 11 — Database Improvements (P2)

### DOPS-048: Add composite indexes and CHECK constraints

**Priority:** P2
**Estimate:** 1 hour

Missing indexes for common query patterns. No CHECK constraints on business rules.

**Acceptance Criteria:**

- Flyway migration V6:
  - `CREATE INDEX idx_orders_tenant_status ON orders(tenant_id, status)`
  - `CREATE INDEX idx_orders_created_at ON orders(created_at)`
  - `ALTER TABLE order_items ADD CHECK (quantity > 0)`
  - `ALTER TABLE menu_items ADD CHECK (price >= 0)`
  - `ALTER TABLE orders ADD CHECK (total_amount >= 0)`
- Verify kitchen view query uses the composite index (EXPLAIN ANALYZE)

**Branch:** `perf/DOPS-048-indexes-constraints`
**Commits:**

- `perf(db): add composite indexes and CHECK constraints via V6 migration`

---

### DOPS-049: Add updated_at trigger in PostgreSQL

**Priority:** P2
**Estimate:** 30 min

Application-level `updatedAt` management is inconsistent. A DB trigger is more reliable.

**Acceptance Criteria:**

- Flyway migration V7:
  - Create `update_updated_at_column()` trigger function
  - Apply trigger to: `restaurants`, `users`, `menu_categories`, `menu_items`, `orders`
- Verify `updated_at` changes on UPDATE even when the application doesn't set it

**Branch:** `feat/DOPS-049-updated-at-trigger`
**Commits:**

- `feat(db): add PostgreSQL trigger for automatic updated_at management`

---

## Epic 12 — Compliance & Legal (P2)

### DOPS-050: Add privacy policy and terms of service

**Priority:** P2
**Estimate:** 4 hours

No legal pages. Required for DPDPA compliance and app store listings.

**Acceptance Criteria:**

- Create `/privacy` and `/terms` routes on the frontend
- Link from login page footer and public menu footer
- Privacy policy covers: data collected, purpose, retention, third-party sharing, rights
- Terms of service covers: acceptable use, disclaimers, liability
- Checkbox on registration: "I agree to the Terms of Service and Privacy Policy"
- Consult a legal professional before going live (placeholder content is fine for now)

**Branch:** `feat/DOPS-050-legal-pages`
**Commits:**

- `feat(frontend): add privacy policy and terms of service pages`
- `feat(frontend): add consent checkbox to registration flow`

---

### DOPS-051: Add data deletion / account deactivation API

**Priority:** P2
**Estimate:** 3 hours

Users cannot request deletion of their data. Required under DPDPA right to erasure.

**Acceptance Criteria:**

- `DELETE /api/v1/users/me` — deactivate account and anonymize PII
- Anonymization: replace name with "Deleted User", email with `deleted_{uuid}@anon.local`, null phone
- Preserve order history (anonymized customer reference)
- Send confirmation email before deletion (7-day grace period)
- SUPER_ADMIN can deactivate any user

**Branch:** `feat/DOPS-051-data-deletion`
**Commits:**

- `feat(user): add account deactivation and PII anonymization endpoint`
- `feat(user): add 7-day grace period and confirmation for account deletion`

---

### DOPS-052: Add FSSAI and GST fields to restaurant entity

**Priority:** P2
**Estimate:** 1 hour

Indian restaurants must display FSSAI license number. GST number needed for invoicing.

**Acceptance Criteria:**

- Add `fssai_license VARCHAR(20)` and `gst_number VARCHAR(20)` to `restaurants` table
- Add fields to `Restaurant.java` entity
- Validate FSSAI format (14 digits) and GSTIN format (15 chars)
- Display on public menu page footer
- Required during restaurant onboarding

**Branch:** `feat/DOPS-052-fssai-gst-fields`
**Commits:**

- `feat(restaurant): add FSSAI license and GST number fields with validation`

---

## Epic 13 — Customer Experience (P2)

### DOPS-053: Add table management for dine-in orders

**Priority:** P2
**Estimate:** 4 hours

No concept of tables. Dine-in restaurants need orders tied to table numbers.

**Acceptance Criteria:**

- Create `tables` table: `(id, tenant_id, table_number, capacity, status, qr_code_url)`
- Add `table_id` FK to `orders` table (nullable for takeaway/delivery)
- Add `order_type` enum: DINE_IN, TAKEAWAY, DELIVERY
- Table management UI in dashboard (add/edit/remove tables)
- QR code generation per table (links to `/menu/{tenantId}?table={tableNumber}`)
- Menu page auto-fills table number from URL parameter

**Branch:** `feat/DOPS-053-table-management`
**Commits:**

- `feat(table): add tables entity with QR code generation`
- `feat(order): add order_type and table_id to orders`
- `feat(frontend): add table management UI and QR code menu linking`

---

### DOPS-054: Add customer order cancellation

**Priority:** P2
**Estimate:** 2 hours

Customers cannot cancel orders. Only kitchen staff can.

**Acceptance Criteria:**

- `POST /api/v1/orders/{orderId}/cancel` — public endpoint
- Only allowed if status is PENDING (within ~2 minutes of placement)
- After CONFIRMED status, cancellation requires kitchen approval
- Return clear error message if cancellation window has passed
- Frontend "Cancel Order" button on order status page (only shown when eligible)

**Branch:** `feat/DOPS-054-customer-cancellation`
**Commits:**

- `feat(order): add customer-initiated order cancellation with time window`
- `feat(frontend): add cancel order button on order status page`

---

### DOPS-055: Add restaurant contact on public pages

**Priority:** P2
**Estimate:** 1 hour

Customer-facing pages show no restaurant phone number or address.

**Acceptance Criteria:**

- `PublicMenuPage` header shows restaurant name, address, phone
- `OrderStatusPage` shows "Contact Restaurant" with phone number (click-to-call on mobile)
- Add restaurant logo display if `logo_url` exists
- Show operating hours (add `operating_hours` JSON field to restaurant)

**Branch:** `feat/DOPS-055-restaurant-contact-info`
**Commits:**

- `feat(frontend): display restaurant contact info on public menu and order pages`
- `feat(restaurant): add operating_hours field`

---

### DOPS-056: Add phone-based order history lookup

**Priority:** P2
**Estimate:** 3 hours

Order history requires knowing the UUID. Customers can't track past orders.

**Acceptance Criteria:**

- Add optional `customer_phone` and `customer_name` to orders (for non-logged-in users)
- `GET /api/v1/orders/lookup?phone=xxx&tenantId=xxx` — returns recent orders for phone number
- Rate-limited to prevent enumeration (5 lookups per phone per hour)
- Frontend: "Enter your phone number to see your orders" on OrderHistoryPage
- OTP verification before showing order list (optional enhancement)

**Branch:** `feat/DOPS-056-phone-order-lookup`
**Commits:**

- `feat(order): add customer_phone field and phone-based order lookup endpoint`
- `feat(frontend): add phone-based order history on tracking page`

---

## Epic 14 — Business Features (P3)

### DOPS-057: Add customer ratings and reviews

**Priority:** P3
**Estimate:** 4 hours

No feedback mechanism. Restaurants can't improve without customer input.

**Acceptance Criteria:**

- Create `reviews` table: `(id, order_id, tenant_id, rating 1-5, comment, created_at)`
- `POST /api/v1/orders/{orderId}/review` — one review per order
- Show review prompt on `OrderStatusPage` after DELIVERED status
- TENANT_ADMIN can view reviews in dashboard
- Average rating displayed on public menu page

**Branch:** `feat/DOPS-057-ratings-reviews`
**Commits:**

- `feat(review): add customer ratings and reviews for orders`
- `feat(frontend): add review prompt on delivered orders and review dashboard`

---

### DOPS-058: Add estimated preparation time

**Priority:** P3
**Estimate:** 3 hours

No time estimate shown to customers. They don't know how long to wait.

**Acceptance Criteria:**

- Calculate average preparation time from order status history (PENDING → READY)
- Show "Estimated ready in ~XX minutes" on `OrderStatusPage`
- Allow restaurant to set manual prep time per menu item (optional)
- Fallback to restaurant-level default if no history data

**Branch:** `feat/DOPS-058-prep-time-estimate`
**Commits:**

- `feat(order): calculate and display estimated preparation time`

---

### DOPS-059: Add inventory management linked to menu items

**Priority:** P3
**Estimate:** 6 hours

No inventory tracking. Items go out of stock but stay on the menu until someone manually marks them unavailable.

**Acceptance Criteria:**

- Create `inventory` table: `(id, menu_item_id, tenant_id, quantity, low_stock_threshold)`
- Decrement inventory on order placement
- Auto-mark item unavailable when inventory hits 0 (auto-86)
- Dashboard inventory management page with stock levels
- Alerts when stock is below threshold

**Branch:** `feat/DOPS-059-inventory-management`
**Commits:**

- `feat(inventory): add inventory tracking with automatic out-of-stock management`
- `feat(frontend): add inventory management dashboard page`

---

### DOPS-060: Add subscription/billing for tenants

**Priority:** P3
**Estimate:** 8 hours

No pricing model. No way to charge restaurants for using the platform.

**Acceptance Criteria:**

- Define plans: Free (50 orders/month), Basic (500 orders, Rs 999/mo), Pro (unlimited, Rs 2999/mo)
- Create `subscriptions` table: `(id, tenant_id, plan, status, starts_at, expires_at)`
- Enforce order limits based on plan
- Billing integration (Razorpay subscriptions or Stripe)
- Subscription management page in dashboard
- Grace period for expired subscriptions (7 days)

**Branch:** `feat/DOPS-060-subscription-billing`
**Commits:**

- `feat(billing): add subscription plans and order limit enforcement`
- `feat(billing): integrate payment gateway for recurring subscriptions`
- `feat(frontend): add subscription management page`

---

### DOPS-061: Add accessibility (a11y) improvements

**Priority:** P3
**Estimate:** 4 hours

No ARIA attributes, no keyboard navigation, no screen reader support.

**Acceptance Criteria:**

- All form inputs have associated `<label>` elements
- All interactive elements are keyboard accessible (Tab, Enter, Escape)
- Add `aria-label` to icon buttons (cart, close, menu toggle)
- Add `role` attributes where semantic HTML is insufficient
- Color contrast meets WCAG 2.1 AA (4.5:1 for text)
- Run axe-core audit and fix all critical/serious violations
- Focus management on modal open/close and page navigation

**Branch:** `feat/DOPS-061-accessibility`
**Commits:**

- `feat(frontend): add ARIA labels, keyboard navigation, and focus management`
- `fix(frontend): fix color contrast to meet WCAG 2.1 AA standards`

---

## Sprint Planning Suggestion

### Sprint 1 (Week 1-2): Foundation & Safety

DOPS-001, DOPS-002, DOPS-003, DOPS-004, DOPS-005, DOPS-006, DOPS-007, DOPS-011, DOPS-012

### Sprint 2 (Week 3-4): Auth & Frontend Core

DOPS-019, DOPS-020, DOPS-022, DOPS-025, DOPS-026, DOPS-027, DOPS-028, DOPS-016

### Sprint 3 (Week 5-6): Security & Infra

DOPS-008, DOPS-009, DOPS-010, DOPS-037, DOPS-040, DOPS-041, DOPS-042, DOPS-017

### Sprint 4 (Week 7-8): Features & Testing

DOPS-013, DOPS-014, DOPS-015, DOPS-018, DOPS-021, DOPS-043, DOPS-044

### Sprint 5 (Week 9-10): Business & Customer

DOPS-023, DOPS-024, DOPS-029, DOPS-030, DOPS-031, DOPS-034

### Sprint 6 (Week 11-12): Polish & Compliance

DOPS-032, DOPS-035, DOPS-036, DOPS-045, DOPS-046, DOPS-048, DOPS-049, DOPS-050, DOPS-052

### Sprint 7+ (Week 13+): Growth Features

DOPS-033, DOPS-038, DOPS-039, DOPS-047, DOPS-051, DOPS-053–DOPS-061

---

## Quick Reference: All Branches

## Sprint Checklist (Jira IDs: DOPS-32 to DOPS-48)

Marking items based on your board screenshots and the code changes already made:

[x] DOPS-32 — dockerignore files for backend and frontend
[x] DOPS-33 — k6 duplicate BASE_URL bug + env-driven base URL
[ ] DOPS-34 — Bean Validation on request DTOs (+ @Valid)
[ ] DOPS-35 — @ControllerAdvice global exception handler
[ ] DOPS-36 — OrderService validation
[ ] DOPS-37 — updateStatus null/invalid fix
[ ] DOPS-38 — Response DTOs for Order/MenuItem/etc
[ ] DOPS-39 — Axios 401 interceptor + redirect to `/login`
[ ] DOPS-40 — `VITE_API_URL` env var in axiosInstance (remove localhost hardcode)
[ ] DOPS-41 — K8s Secrets for DB password and JWT secret
[x] DOPS-42 — Dockerfile non-root user for backend
[x] DOPS-43 — Nginx hardening (gzip/cache/security headers)
[ ] DOPS-44 — React Error Boundary wrapping the app
[ ] DOPS-45 — Toast notifications for API errors
[ ] DOPS-46 — Login form validation
[ ] DOPS-47 — index.html title fix to "DineOps" + small UI polish
[ ] DOPS-48 — (not visible in screenshots you shared; add when you confirm the key)

## Master DOPS Checklist (All Tickets)

[x] DOPS-049 — fix/DOPS-049-restaurant-service-constructor
[x] DOPS-050 — fix/DOPS-050-menu-item-controller-return
[x] DOPS-051 — fix/DOPS-051-restaurant-status-enum
[x] DOPS-052 — security/DOPS-052-hide-password-hash
[x] DOPS-053 — security/DOPS-053-externalize-secrets
[x] DOPS-054 — security/DOPS-054-tenant-isolation
[x] DOPS-055 — security/DOPS-055-restrict-actuator-swagger
[x] DOPS-056 — security/DOPS-056-rate-limiting
[x] DOPS-057 — security/DOPS-057-security-headers
[x] DOPS-058 — security/DOPS-058-account-lockout
[x] DOPS-059 — feat/DOPS-059-global-exception-handler
[x] DOPS-060 — feat/DOPS-060-request-validation
[x] DOPS-061 — feat/DOPS-061-pagination
[x] DOPS-062 — feat/DOPS-062-redis-caching
[x] DOPS-063 — feat/DOPS-063-jpa-auditing
[x] DOPS-064 — refactor/DOPS-064-response-dtos
[x] DOPS-065 — feat/DOPS-065-structured-logging
[x] DOPS-066 — feat/DOPS-066-order-status-validation
[x] DOPS-067 — feat/DOPS-067-user-registration
[x] DOPS-068 — feat/DOPS-068-jwt-refresh-token
[x] DOPS-069 — feat/DOPS-069-restaurant-onboarding
[x] DOPS-070 — feat/DOPS-070-frontend-auth-context
[ ] DOPS-071 — feat/DOPS-071-payment-integration
[ ] DOPS-072 — feat/DOPS-072-gst-invoicing
[x] DOPS-073 — refactor/DOPS-073-cleanup-layouts
[x] DOPS-074 — feat/DOPS-074-typescript-interfaces
[x] DOPS-075 — feat/DOPS-075-api-base-url-env
[x] DOPS-076 — feat/DOPS-076-global-error-handling
[x] DOPS-077 — feat/DOPS-077-loading-empty-states
[x] DOPS-078 — feat/DOPS-078-icons-and-404
[x] DOPS-079 — feat/DOPS-079-error-boundaries
[ ] DOPS-080 — feat/DOPS-080-websocket-orders
[ ] DOPS-081 — feat/DOPS-081-notifications
[x] DOPS-082 — feat/DOPS-082-order-status-history
[ ] DOPS-083 — feat/DOPS-083-audit-log
[ ] DOPS-084 — feat/DOPS-084-analytics-dashboard
[x] DOPS-085 — chore/DOPS-085-complete-docker-k8s
[x] DOPS-086 — chore/DOPS-086-resource-limits
[ ] DOPS-087 — chore/DOPS-087-database-backup
[x] DOPS-088 — chore/DOPS-088-frontend-ci
[x] DOPS-089 — feat/DOPS-089-configurable-cors
[x] DOPS-090 — chore/DOPS-090-hikaricp-config
[x] DOPS-091 — test/DOPS-091-integration-tests
[x] DOPS-092 — test/DOPS-092-service-unit-tests
[ ] DOPS-093 — test/DOPS-093-e2e-playwright
[x] DOPS-094 — test/DOPS-094-frontend-component-tests
[x] DOPS-095 — chore/DOPS-095-coverage-thresholds
[ ] DOPS-096 — perf/DOPS-096-indexes-constraints
[ ] DOPS-097 — feat/DOPS-097-updated-at-trigger
[ ] DOPS-098 — feat/DOPS-098-legal-pages
[ ] DOPS-099 — feat/DOPS-099-data-deletion
[x] DOPS-100 — feat/DOPS-100-fssai-gst-fields
[x] DOPS-101 — feat/DOPS-101-table-management
[x] DOPS-102 — feat/DOPS-102-customer-cancellation
[x] DOPS-103 — feat/DOPS-103-restaurant-contact-info
[ ] DOPS-104 — feat/DOPS-104-phone-order-lookup
[ ] DOPS-105 — feat/DOPS-105-ratings-reviews
[ ] DOPS-106 — feat/DOPS-106-prep-time-estimate
[ ] DOPS-107 — feat/DOPS-107-inventory-management
[ ] DOPS-108 — feat/DOPS-108-subscription-billing
[ ] DOPS-109 — feat/DOPS-109-accessibility
[x] DOPS-110 — fix/DOPS-110-k6-base-url-cleanup
[x] DOPS-111 — security/DOPS-111-backend-non-root
[x] DOPS-112 — chore/DOPS-112-nginx-hardening
[x] DOPS-113 — security/DOPS-113-block-inactive-logins
[x] DOPS-114 — refactor/DOPS-114-password-encoder-bean
[x] DOPS-115 — security/DOPS-115-token-storage-hardening
[x] DOPS-116 — test/DOPS-116-isolated-test-db

