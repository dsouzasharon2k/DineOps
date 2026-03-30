# PlatterOps — Junior Developer Technical Interview

> These questions are designed to verify that a developer who claims to have built PlatterOps
> actually understands the specific decisions made in this codebase — not just generic concepts.
> Generic textbook answers should be considered a red flag. Look for answers tied to *this* project.

---

## Section 1: Project Overview & Architecture

**Q1. In one sentence, what problem does PlatterOps solve? What is the core business model?**

> **Expected answer:** PlatterOps is a multi-tenant SaaS platform for restaurant management — each restaurant is a tenant that pays for a subscription plan. It provides menu management, order tracking, inventory, analytics, and a public-facing ordering experience all in one system.

---

**Q2. How does multi-tenancy work in this project? How is tenant isolation enforced?**

> **Expected answer:** Multi-tenancy is "one tenant = one restaurant" in a shared schema. All tables carry a `tenant_id` foreign key pointing to the `restaurants` table. Isolation is enforced at two layers:
> 1. The `TenantAuthorizationFilter` (a servlet filter) intercepts every request and compares the tenant ID in the URL path (or `?tenantId=` query param) against the `tenantId` claim in the user's JWT. If they don't match and the user is not `SUPER_ADMIN`, it returns 403.
> 2. Every service method queries with a `tenantId` condition so one restaurant can never read another's data.
>
> There is no schema-per-tenant or database-per-tenant — it's all row-level isolation.

---

**Q3. Walk me through the four user roles and what each one can do.**

> **Expected answer:**
> - `CUSTOMER` — places orders via the public menu, tracks order status, writes reviews, looks up order history by phone number.
> - `STAFF` — belongs to a specific restaurant (`tenant_id` is required on the `users` row by a DB constraint added in V23). Can update order statuses, view active orders.
> - `TENANT_ADMIN` — full control over their own restaurant: manage menu, inventory, tables, view analytics, manage staff.
> - `SUPER_ADMIN` — platform-level admin; can see all restaurants, access all tenants' data, approve restaurant onboarding.

---

**Q4. What is the tech stack?**

> **Expected answer:**
> - **Backend:** Spring Boot 3.x (Java 21), PostgreSQL, Flyway migrations, Redis (cache + rate limiting), JJWT for JWT, Spring AOP, WebSocket (STOMP over SockJS), Micrometer/Prometheus, Springdoc/Swagger.
> - **Frontend:** React 19 (TypeScript), Vite, Tailwind CSS v4, Zustand, React Router DOM v7, Axios, `@stomp/stompjs` + `sockjs-client`.
> - **Testing:** JUnit 5 + Mockito (backend unit), `@SpringBootTest` integration tests with H2 in-memory DB, Vitest + Testing Library (frontend unit), Playwright (E2E).

---

## Section 2: Database Design

**Q5. Why are prices stored as integers in the database? What unit is used?**

> **Expected answer:** Prices are stored in **paise** (100 paise = 1 Indian Rupee), as integers. This avoids floating-point precision bugs that would occur if prices were stored as `DECIMAL` or `FLOAT` — e.g., `0.1 + 0.2 != 0.3` in floating-point arithmetic. The code explicitly documents this: `Rs 150.50 = 15050 paise`. Division by 100 happens only at display/response time, never during calculations.

---

**Q6. What is Flyway and why is it used here instead of letting Hibernate create/alter tables?**

> **Expected answer:** Flyway is a database migration tool. `application.yml` sets `ddl-auto: validate` — Hibernate only validates that the schema matches the entities; it never alters the schema itself. Flyway owns all schema changes via versioned SQL scripts (`V1__`, `V2__`, ...) stored in `resources/db/migration`. This gives a reproducible, auditable migration history. If a developer adds a column in Hibernate but forgets a Flyway script, the app will fail to start — a safety net.

---

**Q7. What does the V23 migration do with unique constraints, and why?**

> **Expected answer:** V23 drops the global `UNIQUE` constraints on `restaurants.slug`, `users.email`, and `dining_tables(tenant_id, table_number)`, and replaces them with **partial unique indexes** using `WHERE deleted_at IS NULL`. This allows soft-deleted records to be "reused" — e.g., if a restaurant with slug `pizza-palace` is soft-deleted, a new restaurant can claim that slug. With a global UNIQUE constraint that would be impossible even after deletion.

---

**Q8. Explain the `update_updated_at_column()` trigger. Why is it a PostgreSQL trigger rather than handled in Java code?**

> **Expected answer:** V6 creates a PostgreSQL trigger function that automatically sets `updated_at = NOW()` on any row update, and V16 attaches it to all major tables. It lives in the database so `updated_at` is always accurate regardless of how the row is modified — through Hibernate, raw SQL, a migration, or a DBA's direct query. If this were only in Java (e.g., `@PreUpdate`), bypassing the application layer would leave stale `updated_at` values.

---

**Q9. What are the V24 and V25 migrations about?**

> **Expected answer:**
> - **V24** adds `meal_period` as a **PostgreSQL generated stored column** (computed from order creation time: BREAKFAST/LUNCH/SNACK/DINNER/LATE), adds `cancellation_reason`/`cancelled_by` on orders, and creates analytics views (`vw_accurate_prep_times`, `vw_item_revenue`, `vw_review_order_context`) plus composite indexes to support the analytics queries.
> - **V25** adds FSSAI food card metadata to menu items: `diet_type`, `serving_size`, `ingredients`, `spice_level`, and three new tables — `menu_item_flavour_tags`, `menu_item_allergens` (using a PostgreSQL native ENUM type `allergen_type`), and `menu_item_nutrition`. It also creates the `vw_menu_item_card` view that joins all this into one queryable surface.

---

**Q10. What is the Indian regulatory significance of the `fssai_license` and `gst_number` fields on the restaurant?**

> **Expected answer:** `fssai_license` is the license number from the Food Safety and Standards Authority of India — legally required for any food business in India. `gst_number` is the GST registration number. Both are surfaced in the invoice PDF generated by `OrderService.generateInvoicePdf()`, along with a GST breakdown (5% GST reverse-calculated from the order total). These fields were added in V7 specifically for Indian legal compliance.

---

## Section 3: Authentication & Security

**Q11. How does JWT authentication work in this project? What claims are stored in the token?**

> **Expected answer:** `JwtUtils` creates JWTs signed with an HMAC-SHA key (configurable via env var). The token payload carries: `userId`, `email`, `role`, `tenantId`, and `tokenType` (`access` or `refresh`). The `JwtAuthFilter` runs before every request — it parses the `Authorization: Bearer` header, validates the signature and expiry, and sets a Spring Security `Authentication` object. It also writes `authTenantId` and `authRole` as request attributes for downstream use. There are two token lifetimes: access token (24h default) and refresh token (7d, sent as an HttpOnly cookie).

---

**Q12. Why is the access token stored in memory in the frontend rather than in localStorage?**

> **Expected answer:** Storing JWTs in `localStorage` makes them vulnerable to XSS — any injected JavaScript can read `localStorage`. The frontend stores the access token in an in-memory singleton (`auth/tokenStore.ts`), which is inaccessible to scripts. The refresh token lives in an **HttpOnly cookie**, which the browser sends automatically but scripts cannot read. The downside is that the access token is lost on page refresh — the app silently calls the refresh endpoint to get a new access token on mount.

---

**Q13. How does rate limiting work? What happens if Redis goes down?**

> **Expected answer:** `RateLimitService` uses Redis `INCR` + `EXPIRE` as a sliding window counter. Login is limited to 10 attempts per minute per email; registration to 5 per minute. The design is deliberately **fail-open**: if Redis is unavailable, `isAllowed()` returns `true` — the rate limit is silently skipped. This is a conscious availability-over-security trade-off, documented in the code. For a low-scale SaaS, being locked out of login because Redis is down would be worse than briefly having no rate limiting.

---

**Q14. How does account lockout differ from rate limiting?**

> **Expected answer:** Rate limiting (`RateLimitService`) is a per-minute request throttle — it rejects attempts above a threshold within a time window. Account lockout (`AccountLockoutService`) is cumulative: after 5 failed login attempts within 15 minutes, it sets a separate Redis key (`auth:lock:{email}`) with a 15-minute TTL, blocking that account regardless of request rate. On a successful login, both the failure count key and the lock key are cleared.

---

**Q15. How does `TenantAuthorizationFilter` extract the tenant ID from a request?**

> **Expected answer:** It uses a **compiled regex** — `^/api/v1/restaurants/([0-9a-fA-F\\-]{36})(?:/.*)?$` — matched against the request URI to extract the UUID. If the URI doesn't match (e.g., it's not a restaurant-scoped path), it falls back to the `?tenantId=` query parameter. Public `GET /api/v1/restaurants/**` endpoints are whitelisted so anonymous users can browse public menus without a JWT.

---

## Section 4: Core Business Logic

**Q16. Describe the order status state machine. Which transitions are valid?**

> **Expected answer:** The state machine is defined as a static `EnumMap<OrderStatus, Set<OrderStatus>>` in `OrderService`:
> - `PENDING` → CONFIRMED, CANCELLED
> - `CONFIRMED` → PREPARING, CANCELLED
> - `PREPARING` → READY, CANCELLED
> - `READY` → DELIVERED, CANCELLED
> - `DELIVERED` → (terminal, no transitions)
> - `CANCELLED` → (terminal, no transitions)
>
> Customers can self-cancel only when the order is `PENDING`. If `CONFIRMED`, they get an error saying kitchen approval is required. Any invalid transition attempt throws an exception.

---

**Q17. What happens when a customer places an order? Walk through the `placeOrder()` method.**

> **Expected answer (key steps):**
> 1. The restaurant is fetched and validated (must be ACTIVE).
> 2. Operating hours are checked via `OperatingHoursParser` — rejects if the restaurant is currently closed.
> 3. `SubscriptionService.validateTenantCanPlaceOrder()` is called — checks the subscription is active (or in grace period) and the monthly order count hasn't been exceeded.
> 4. Each menu item is fetched, validated as belonging to the tenant, and checked for availability.
> 5. `InventoryService.consumeStockIfTracked()` deducts stock for each item (if inventory is being tracked).
> 6. The `Order` entity is built, total is calculated from menu item prices.
> 7. The initial `OrderStatusHistory` record (`PENDING`) is saved.
> 8. A prep time estimate is computed and included in the response.
> 9. A real-time WebSocket event is published.
> 10. The audit log is written (via AOP, not inline).

---

**Q18. How does the subscription system gate order placement? What are the three plans and their limits?**

> **Expected answer:**
> - `STARTER` — 300 orders/month
> - `GROWTH` — 2,000 orders/month
> - `ENTERPRISE` — unlimited
>
> `SubscriptionService.validateTenantCanPlaceOrder()` checks: (1) a subscription exists, (2) it's within the grace period (7 days after `expires_at`), and (3) the count of orders placed in the current calendar month hasn't exceeded the plan limit. If any check fails, an exception is thrown and the order is rejected.

---

**Q19. How does inventory auto-sync availability for menu items?**

> **Expected answer:** `InventoryService.syncAvailability()` is called after every stock deduction. If the remaining quantity reaches zero, it calls `menuItemRepository.save()` to set `is_available = false` on the corresponding `MenuItem`. This means when the last unit of an item is ordered, it automatically disappears from the public menu without any manual admin action.

---

**Q20. How does the operating hours parser handle a restaurant that is open past midnight (e.g., 10 PM to 2 AM)?**

> **Expected answer:** `OperatingHoursParser` checks if `close.isAfter(open)`. If it is, it's a normal same-day window. If `close` is NOT after `open` (close time is earlier than open time numerically), it's a midnight crossover — the restaurant is open if the current time is `>= open` OR `< close`. The parser reads from a JSON string stored in `restaurants.operating_hours`, with per-day keys (`"monday"`, `"tuesday"`, etc.) and null meaning closed that day.

---

**Q21. How is prep time estimated for an order?**

> **Expected answer:** `estimateReadyMinutes()` uses a four-tier priority:
> 1. The maximum `prep_time_minutes` set on any individual menu item in the order.
> 2. Historical average — queries `order_status_history` for the average duration between `CONFIRMED` and `READY` status transitions for the tenant's recent orders.
> 3. The restaurant's `default_prep_time_minutes` setting.
> 4. Hard fallback of 20 minutes if nothing else is available.

---

## Section 5: Caching & Real-time

**Q22. What is cached in Redis and what is deliberately NOT cached? Why?**

> **Expected answer:** Individual orders by ID, active orders by tenant, and orders by tenant are cached in Redis (three named caches). These are evicted by `@CacheEvict` whenever an order is placed, status-changed, cancelled, or a payment webhook is received.
>
> `Page<T>` / paginated results are **deliberately not cached**. There's an explicit comment in `RestaurantService` explaining that `PageImpl` deserializes from Redis as a `LinkedHashMap`, causing a `ClassCastException` at runtime. Only entity-level or list-level results are cached.

---

**Q23. How is the `LocalDateTime` / Java time serialization issue solved in the Redis cache?**

> **Expected answer:** `CacheConfig` creates a custom `ObjectMapper` bean with `JavaTimeModule` registered and `WRITE_DATES_AS_TIMESTAMPS` set to `false`. This is passed to `GenericJackson2JsonRedisSerializer`. Without this, Java 8+ date/time types serialize as numeric arrays (e.g., `[2024, 3, 15, 10, 30, 0]`) in Redis, and deserialization fails because the type information doesn't roundtrip correctly.

---

**Q24. How does real-time order tracking work via WebSocket?**

> **Expected answer:** The backend uses STOMP over SockJS (`/ws` endpoint). When an order changes state, `OrderService.publishRealtimeUpdate()` sends a message to two topics:
> - `/topic/orders/{tenantId}` — the kitchen display board subscribes here
> - `/topic/order/{orderId}` — the customer's order tracking page subscribes here
>
> The `WebSocketAuthInterceptor` validates the JWT on `CONNECT` and enforces tenant isolation on `SUBSCRIBE` — subscribing to `/topic/orders/{tenantId}` requires the JWT's `tenantId` to match or the user to be `SUPER_ADMIN`. On the frontend, `ordersSocket.ts` creates a STOMP client passing the access token in `connectHeaders`.

---

**Q25. Why are `SimpMessagingTemplate` and `InventoryService` injected with `@Autowired(required = false)` in `OrderService`?**

> **Expected answer:** To make `OrderService` resilient to missing beans in certain environments — specifically test contexts where WebSocket or Redis-backed beans may not be available. With `required = false`, if these beans aren't in the Spring context (e.g., a unit test using `@MockBean` selectively), Spring injects `null` instead of failing context startup. Every call site in `OrderService` null-checks these before invoking them.

---

## Section 6: Audit Logging & AOP

**Q26. How does the audit log work? How is it triggered?**

> **Expected answer:** A custom annotation `@AuditedAction(entityType, action)` marks service methods that should be audited (e.g., `placeOrder`, `updateStatus`, `createRestaurant`). `AuditLogAspect` (a Spring AOP `@Around` advice) intercepts calls to methods annotated with `@AuditedAction`. It proceeds with the method, then uses **reflection** on the return value to extract `getId()` (entity ID) and `getTenantId()` (tenant ID), captures the method arguments as JSON for `old_value`/`new_value`, and persists an `AuditLog` row. This keeps audit logic completely decoupled from business logic.

---

**Q27. What is a potential fragility in the AOP audit log approach used here?**

> **Expected answer:** The aspect uses reflection to call `getId()` and `getTenantId()` on return values. If a method's return type changes (e.g., returns `void`, a primitive, or a DTO without those methods), the reflection will fail silently or throw at runtime. There is no compile-time safety — the linkage between `@AuditedAction` and the expected return type shape is implicit. The code handles Java records (which don't use `get` prefixes) with a fallback, but any new return type shape would need corresponding reflection logic.

---

## Section 7: Soft Delete & DPDP Compliance

**Q28. How is soft delete implemented at the ORM level?**

> **Expected answer:** Major entities (`Restaurant`, `User`, `MenuItem`) extend `AuditableEntity` which has a `deleted_at` column. At the entity class level, `@SQLRestriction("deleted_at IS NULL")` (a Hibernate annotation) appends this SQL condition to **every** JPA query automatically — including those generated from Spring Data method names like `findByTenantId()`. No repository method needs to be updated to exclude soft-deleted records; it's handled transparently at the ORM layer.

---

**Q29. What is the `UserDeletionJob` and why was it built?**

> **Expected answer:** `UserDeletionJob` is a Spring `@Scheduled` job that runs daily at 2 AM. It implements **right-to-erasure** as required by India's DPDP Act (and similar to GDPR Article 17). When a user requests deletion, `deletion_scheduled_for` is set to 30 days in the future. The job finds users past that date and anonymizes them: name → `"Deleted User"`, email → `"deleted_{id}@anon.local"`, phone and passwordHash → null, and `deleted_at` is set. The V23 migration also adds `customer_data_erased_at` on `orders` for anonymizing guest customer PII (name, email, phone stored on orders).

---

## Section 8: Frontend

**Q30. How does the frontend prevent storing the JWT in an XSS-accessible location while surviving navigation?**

> **Expected answer:** The access token is stored in `auth/tokenStore.ts` — an in-memory singleton module variable. Module-level variables in a browser SPA are not accessible to injected scripts (unlike `localStorage` or `sessionStorage`). The token survives React navigation (route changes) because the module stays loaded, but is lost on a hard refresh. On app mount, the frontend calls the refresh token endpoint — the refresh token lives in an **HttpOnly cookie** that the browser sends automatically, and the server responds with a new access token. This pattern is called "silent refresh."

---

**Q31. How does the cart handle switching between restaurants?**

> **Expected answer:** The Zustand `cartStore` uses Zustand's `persist` middleware (so the cart survives refresh). The cart is keyed per-tenant (`tenantId`). When a user navigates to a different restaurant's public menu, the store checks if the cart's current `tenantId` matches the new restaurant — if not, the cart is cleared before adding any items. This prevents accidentally mixing items from two different restaurants in one order.

---

**Q32. What pages use WebSocket connections and how is cleanup handled?**

> **Expected answer:**
> - `KitchenPage.tsx` — subscribes to `/topic/orders/{tenantId}` for live order updates on the kitchen display board.
> - `OrderStatusPage.tsx` — subscribes to `/topic/order/{orderId}` for real-time status updates for a specific order.
>
> Both `subscribeTenantOrders()` and `subscribeOrderStatus()` in `realtime/ordersSocket.ts` return a **cleanup function**. React components call this cleanup in the `useEffect` return (equivalent to `componentWillUnmount`) to disconnect the STOMP client and avoid memory leaks or duplicate subscriptions.

---

## Section 9: Testing

**Q33. What testing profiles and databases are used for integration tests?**

> **Expected answer:** Integration tests (`AuthControllerIntegrationTest`, `OrderControllerIntegrationTest`, `RestaurantOnboardingIntegrationTest`) use `@SpringBootTest` with `@ActiveProfiles("test")`. The `application-test.yml` profile configures an **H2 in-memory database** in PostgreSQL-compatibility mode instead of a real PostgreSQL instance. Flyway still runs all migrations against H2 on test startup, ensuring the schema matches production. Redis-backed beans are mocked or conditionally excluded in test contexts.

---

**Q34. What coverage thresholds are enforced by the build?**

> **Expected answer:** The JaCoCo Maven plugin (v0.8.11) is configured with minimum coverage rules: **45% line coverage** and **25% branch coverage** across the entire backend. If a PR drops below these thresholds, the Maven build (`mvn verify`) fails. SonarQube integration via `sonar-maven-plugin` is also wired for quality gate analysis.

---

## Section 10: Gotcha / Deep-Dive Questions

**Q35. If a developer adds a new `Menu Item` entity field in Java but forgets the Flyway migration, what exactly happens when the app starts?**

> **Expected answer:** The app fails to start with a Hibernate `SchemaValidationException`. Because `ddl-auto: validate` is set, Hibernate compares the entity metadata against the actual DB schema on startup. The missing column will cause validation to fail immediately, preventing the app from serving any requests. This is a deliberate safety net — it's impossible to silently run with a mismatched schema.

---

**Q36. Why does `meal_period` exist as a generated column in the database rather than being computed in Java?**

> **Expected answer:** `meal_period` (BREAKFAST/LUNCH/SNACK/DINNER/LATE) is a PostgreSQL `GENERATED ALWAYS AS (...)` stored column computed from `created_at`. Being stored in the DB makes it available for **indexed analytics queries** without any runtime computation — `vw_item_revenue` and the composite analytics indexes in V24 use it directly. If it were computed in Java, it couldn't be used in DB-level GROUP BY or indexes without always reading all rows.

---

**Q37. A restaurant has operating hours Monday–Sunday, but the owner left Wednesday `null`. What happens on Wednesday when a customer tries to place an order?**

> **Expected answer:** In `OperatingHoursParser`, a `null` value for a day means the restaurant is **closed** that day. The parser returns `false` for `isOpenNow()`, and `OrderService.placeOrder()` rejects the order with an appropriate error. A missing day key (key not present at all) is different from `null` — a missing key is treated as "always open" for backward compatibility with older restaurant records that predate operating hours support.

---

**Q38. What prevents a `STAFF` user from one restaurant from placing an order or viewing orders for a different restaurant?**

> **Expected answer:** The `TenantAuthorizationFilter` is the first line of defense. It extracts the tenant ID from the request URL and compares it to the `tenantId` claim in the JWT. If a STAFF user with `tenantId = ABC` makes a request to `/api/v1/restaurants/XYZ/orders`, the filter sees the mismatch and returns `403 Forbidden` before the request ever reaches the controller. Additionally, the DB constraint added in V23 enforces that `STAFF` users must have a non-null `tenant_id`, preventing a STAFF account from existing without belonging to a specific restaurant.

---

**Q39. How does the invoice PDF include a GST breakdown if only the total amount is stored on the order?**

> **Expected answer:** `OrderService.generateInvoicePdf()` uses **reverse GST calculation**. Since India applies 5% GST inclusively (GST is included in the displayed price), the tax component is derived from the total: `taxAmount = totalAmount / 1.05 * 0.05` — i.e., total divided by 1.05 gives the pre-tax amount, and multiplying by 0.05 gives the tax. The base amount is `totalAmount - taxAmount`. This means the GST breakdown can always be reconstructed from the order total without storing it separately.

---

**Q40. Why would you get a `ClassCastException` if you tried to cache a `Page<OrderResponse>` in Redis, and how did you handle it?**

> **Expected answer:** When Spring's `GenericJackson2JsonRedisSerializer` deserializes data from Redis, it reads the stored JSON back into a Java object. `PageImpl` (Spring Data's `Page` implementation) doesn't have a clean no-arg constructor and its JSON representation doesn't roundtrip correctly — it comes back as a `LinkedHashMap` rather than a `PageImpl`. Casting that `LinkedHashMap` to `Page<OrderResponse>` throws `ClassCastException` at runtime. The fix is to **not cache paginated results** — only cache entity-level or `List<T>` results, and always re-query for paginated data.

---

*End of interview guide. A candidate who built this project should be able to answer all 40 questions with specifics — class names, exact behavior, and the "why" behind each decision.*
