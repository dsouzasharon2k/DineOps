# PlatterOps — Beta V1 Release Plan

> Pre-interview deployment checklist + future scope.
> Generated from a full codebase verification on 2026-03-21.

---

## Current State Summary

The Master DOPS Checklist (DOPS-049 through DOPS-116) is fully complete. The app compiles, runs, and has a solid feature set including:
- Multi-tenant auth with JWT + refresh tokens + HttpOnly cookies
- Tenant isolation filter, rate limiting, account lockout
- Full order lifecycle with status history tracking
- Kitchen Kanban with WebSocket real-time updates
- Analytics dashboard, audit logging, inventory management
- Subscription tiers with order-limit enforcement
- CI pipeline (frontend + backend + E2E + SonarCloud)

**What remains are gaps that would surface during an interview demo or code review.**

---

## Naming Conventions

| Item   | Pattern                           | Example                                      |
| ------ | --------------------------------- | -------------------------------------------- |
| Branch | `<type>/<ticket-id>-<short-desc>` | `fix/DOPS-120-readme-versions`               |
| Commit | `<type>(scope): message`          | `fix(docs): correct tech stack versions`     |

Jira offset rule: `Jira DOPS-<J>` = `BETA_V1_RELEASE.md DOPS-<D>` + `48`

---

## Phase 1 — Must Fix Before Interview Demo (~6 hours)

These are issues an interviewer **will notice** during a demo, code walkthrough, or GitHub review.

---

### DOPS-120: Fix README tech stack version mismatches

**Priority:** P0 — First thing an interviewer sees
**Estimate:** 15 min

README states React 18.x / Vite 5.x / Tailwind 3.x but `package.json` has React 19.2 / Vite 7.3 / Tailwind 4.2. An interviewer who opens `package.json` will notice the discrepancy.

**What to fix:**

| README says       | Actual (package.json) |
| ----------------- | --------------------- |
| React 18.x        | React 19.2            |
| Vite 5.x          | Vite 7.3              |
| Tailwind CSS 3.x  | Tailwind CSS 4.2      |
| Playwright 1.x    | Playwright 1.55       |

**Acceptance Criteria:**

- Tech stack table matches actual dependency versions
- Mention React 19 explicitly (talking point — latest stable)

**Branch:** `fix/DOPS-120-readme-versions`
**Commits:**
- `fix(docs): align README tech stack versions with actual dependencies`

---

### DOPS-121: Fix CSP header blocking WebSocket connections

**Priority:** P0 — Kitchen Kanban may silently fail
**Estimate:** 30 min

`SecurityConfig.java` sets `Content-Security-Policy: default-src 'self'` which blocks `ws://` and `wss://` WebSocket connections. The frontend `nginx.conf` already has the correct CSP with `connect-src 'self' http: https: ws: wss:`, but the backend header overrides it for API responses.

**Root cause:** The backend Spring Security CSP header is applied to all responses from the backend, including the WebSocket upgrade handshake. The browser's CSP is evaluated from the **page-serving origin** (nginx), but during development (Vite dev server → Spring Boot directly), the backend CSP applies.

**Fix options (pick one):**
1. Update backend CSP to include `connect-src 'self' ws: wss:` (recommended)
2. Remove CSP from backend SecurityConfig entirely and rely on nginx CSP header in production

**Acceptance Criteria:**

- WebSocket connections succeed without CSP violations in browser console
- CSP header still present and restrictive (`default-src 'self'` with explicit `connect-src`)
- Test: open Kitchen page, verify no CSP errors in DevTools console

**Branch:** `fix/DOPS-121-csp-websocket`
**Commits:**
- `fix(security): add connect-src directive to CSP for WebSocket support`

---

### DOPS-122: Authenticate WebSocket connections

**Priority:** P0 — An interviewer reviewing SecurityConfig will see `/ws/**` is `permitAll()`
**Estimate:** 2 hours

`/ws/**` is fully public. Any unauthenticated client can connect to the STOMP broker, subscribe to `/topic/orders/{tenantId}`, and receive real-time order data for **any tenant**. This is a data leak by design.

**Implementation:**

1. Add a `StompChannelInterceptor` that intercepts `CONNECT` frames
2. Extract JWT from STOMP `Authorization` header (or native header)
3. Validate the token via `JwtUtils`
4. On `SUBSCRIBE`, verify the tenant ID in the topic matches the JWT's `tenantId` (SUPER_ADMIN bypasses)
5. Reject unauthenticated or cross-tenant subscriptions with STOMP ERROR frame

```java
@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {
    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = accessor.getFirstNativeHeader("Authorization");
            // validate JWT, set principal
        }
        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            // verify topic tenant matches JWT tenant
        }
        return message;
    }
}
```

**Acceptance Criteria:**

- Unauthenticated STOMP CONNECT is rejected
- Authenticated user can only subscribe to their own tenant's topics
- SUPER_ADMIN can subscribe to any topic
- Frontend `ordersSocket.ts` updated to pass JWT on CONNECT
- Kitchen Kanban still works end-to-end after the change

**Branch:** `security/DOPS-122-websocket-auth`
**Commits:**
- `security(websocket): add STOMP channel interceptor for JWT authentication`
- `security(websocket): enforce tenant-scoped topic subscriptions`
- `feat(frontend): pass JWT token on STOMP CONNECT frame`

---

### DOPS-123: Add shared currency formatting utility

**Priority:** P1 — Shows engineering maturity during code review
**Estimate:** 30 min

Paise-to-rupee conversion is done inline in at least 5 files: `MenuPage.tsx`, `PublicMenuPage.tsx`, `OrderConfirmPage.tsx`, `OrderStatusPage.tsx`, `KitchenPage.tsx`. Each uses `(price / 100).toFixed(2)` with no consistency guarantee.

**Implementation:**

Create `frontend/src/utils/currency.ts`:
```typescript
export function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}
```

Replace all inline `₹${(x / 100).toFixed(2)}` with `formatCurrency(x)`.

**Acceptance Criteria:**

- Single `formatCurrency` utility used across all components
- No inline paise-to-rupee math remains in any `.tsx` file
- Prices still display correctly on all pages

**Branch:** `refactor/DOPS-123-currency-formatter`
**Commits:**
- `refactor(frontend): add shared formatCurrency utility and remove inline formatting`

---

### DOPS-124: Raise JaCoCo coverage thresholds

**Priority:** P1 — 35%/10% is indefensible in an interview
**Estimate:** 30 min

Current thresholds: 35% line / 10% branch. These are so low they provide almost no safety net. An interviewer asking "what are your coverage thresholds?" will be unimpressed.

Since existing tests (unit + integration) likely already exceed 50%, this is just a config change.

**Fix:**

```xml
<minimum>0.50</minimum>  <!-- LINE (was 0.35) -->
<minimum>0.25</minimum>  <!-- BRANCH (was 0.10) -->
```

**Acceptance Criteria:**

- JaCoCo thresholds raised to 50% line / 25% branch minimum
- `mvn verify` still passes with current test suite
- If tests fail at new threshold, add tests to close the gap (not lower the bar)

**Branch:** `chore/DOPS-124-jacoco-thresholds`
**Commits:**
- `chore(quality): raise JaCoCo coverage thresholds to 50% line / 25% branch`

---

### DOPS-125: Add operating hours enforcement on order placement

**Priority:** P1 — Interviewer will ask "what happens if someone orders at 3 AM?"
**Estimate:** 2 hours

`operating_hours` is stored as TEXT and displayed on the public menu page, but `OrderService.placeOrder()` never checks whether the restaurant is currently open. A customer can place an order at any time.

**Implementation:**

1. Define `operating_hours` JSON schema:
   ```json
   {
     "monday":    { "open": "09:00", "close": "22:00" },
     "tuesday":   { "open": "09:00", "close": "22:00" },
     "wednesday": null,
     ...
   }
   ```
2. Create `OperatingHoursParser` utility to parse TEXT → structured map
3. Add validation in `OrderService.placeOrder()` — check current day/time against restaurant's hours
4. Return `400 Bad Request` with message "Restaurant is currently closed. Operating hours: ..."
5. Frontend: show "Currently Closed" badge on `PublicMenuPage` and disable "Place Order" button

**Acceptance Criteria:**

- Orders rejected when restaurant is outside operating hours
- Clear error message returned to customer
- Frontend shows closed status visually
- Null `operating_hours` treated as "always open" (backward compatible)
- Unit test for open/closed scenarios including edge cases (midnight crossover, null hours)

**Branch:** `feat/DOPS-125-operating-hours-enforcement`
**Commits:**
- `feat(order): enforce restaurant operating hours on order placement`
- `feat(frontend): show closed status and disable ordering outside hours`

---

## Phase 2 — Should Fix Before Interview (~4 hours)

These won't break the demo but strengthen your answers to technical questions.

---

### DOPS-126: Implement user deletion scheduled job

**Priority:** P1 — "You have `deletion_scheduled_for` but nothing executes it" is a pointed question
**Estimate:** 1.5 hours

V17 migration added `deletion_requested_at` and `deletion_scheduled_for` to the `users` table. `DELETE /users/me` sets these fields. But there is **no scheduled job** that actually processes deletions. Under DPDP (India's Digital Personal Data Protection Act), failing to execute a deletion request is a regulatory violation.

**Implementation:**

```java
@Component
public class UserDeletionJob {

    @Scheduled(cron = "0 0 2 * * *") // 2 AM daily
    public void processScheduledDeletions() {
        List<User> users = userRepository
            .findByDeletionScheduledForBeforeAndDeletedAtIsNull(Instant.now());
        for (User user : users) {
            user.setName("Deleted User");
            user.setEmail("deleted_" + user.getId() + "@anon.local");
            user.setPhone(null);
            user.setPasswordHash(null);
            user.setDeletedAt(Instant.now());
            userRepository.save(user);
            log.info("user_deleted userId={}", user.getId());
        }
    }
}
```

**Acceptance Criteria:**

- `@Scheduled` job runs daily at 2 AM
- Users with `deletion_scheduled_for <= now()` are anonymized and soft-deleted
- PII (name, email, phone, password) is scrubbed
- Order history preserved with anonymized customer reference
- `@EnableScheduling` added to a config class
- Unit test for the job logic

**Branch:** `feat/DOPS-126-deletion-job`
**Commits:**
- `feat(user): implement scheduled job for user data deletion and PII anonymization`
- `test(user): add unit test for deletion job processing`

---

### DOPS-127: Add Playwright Firefox to CI matrix

**Priority:** P2 — Shows cross-browser awareness
**Estimate:** 30 min

E2E tests only run on Chromium. For a food ordering platform where most customers use Safari (iOS) or Chrome (Android), testing only Chromium is a gap. Adding Firefox is a quick CI config change.

**Fix in `ci.yml`:**
```yaml
- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium firefox
```

And in `playwright.config.ts`, add Firefox project.

**Acceptance Criteria:**

- Playwright runs on both Chromium and Firefox in CI
- E2E tests pass on both browsers
- CI failure on either browser blocks merge

**Branch:** `test/DOPS-127-playwright-firefox`
**Commits:**
- `test(e2e): add Firefox to Playwright CI matrix`

---

### DOPS-128: Migrate cartStore to reactive state (Zustand)

**Priority:** P2 — Shows state management understanding
**Estimate:** 1.5 hours

`cartStore.ts` is a plain ES module backed by `localStorage`. Components reading from it don't re-render when the cart changes because there's no reactivity layer. This causes real UI bugs: the cart icon count won't update when items are added from a different component.

**Implementation:**

```bash
npm install zustand
```

```typescript
// store/cartStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartState {
  cart: Cart | null;
  addItem: (tenantId: string, item: CartItem) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  // ...
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      cart: null,
      addItem: (tenantId, item) => { /* ... */ set({ cart: updatedCart }); },
      // ...
    }),
    { name: 'dineops-cart' }
  )
);
```

**Acceptance Criteria:**

- Cart state is reactive — adding an item in one component updates all components reading the cart
- Per-tenant isolation preserved (switching tenant clears cart)
- Data persisted in localStorage via Zustand `persist` middleware
- All existing cart functionality preserved
- Components use `useCartStore()` hook instead of `cartStore.getCart()`

**Branch:** `refactor/DOPS-128-zustand-cart`
**Commits:**
- `refactor(frontend): migrate cartStore from plain module to Zustand reactive store`
- `refactor(frontend): update all components to use useCartStore hook`

---

## Phase 3 — Interview Talking Points (Know These, Don't Need to Fix)

These are gaps you should be **prepared to discuss** when asked. Frame them as deliberate decisions with a clear "next step" rather than oversights.

---

### "Why is NotificationService just logging?"

**Your answer:** "It's a deliberate **stub pattern**. The interface contract (`sendOrderPlacedNotification`, `sendOrderStatusNotification`) is defined with proper conditional logic (checks `notifyCustomerEmail`/`notifyCustomerSms` flags). In production, the implementation would be swapped to use SendGrid for email and MSG91 for SMS via a Spring profile or feature flag. The stub lets me develop the full order flow without external service dependencies."

### "Why is PostgreSQL a Deployment and not a StatefulSet?"

**Your answer:** "For local development and Kind clusters, a Deployment with a PVC works fine. For production, I'd use a **managed database** — AWS RDS or Google Cloud SQL — not a self-hosted PostgreSQL pod at all. The K8s manifests are for the application tier. The StatefulSet question only applies if you're running a database in K8s, which I'd avoid for a production SaaS."

### "Where's the Ingress and HPA?"

**Your answer:** "The current manifests use NodePort for local Kind clusters. Production deployment would add an **nginx Ingress Controller** with cert-manager for TLS, and an HPA targeting 70% CPU with 2–8 replicas. I kept the K8s manifests focused on what's testable locally — adding an Ingress that points to a nonexistent domain isn't useful in a dev cluster."

### "REFUNDED exists in PaymentStatus but isn't used anywhere?"

**Your answer:** "The enum is forward-defined. The refund workflow is planned as: add `REFUND_REQUESTED` and `REFUND_PROCESSING` states, build a `POST /orders/{id}/refund` endpoint gated to SUPER_ADMIN/TENANT_ADMIN, and integrate with Razorpay's refund API. I defined the enum value early so the database migration doesn't need to change when the feature ships."

### "The subscription checkout doesn't actually charge anything?"

**Your answer:** "Order-limit enforcement is implemented — STARTER gets 300/month, GROWTH gets 2,000, ENTERPRISE is unlimited. The billing integration (Razorpay subscriptions API) is the next phase. Currently, subscription records are created manually. The architecture is ready: `provider_subscription_ref` field exists to link to the payment provider's subscription ID."

### "What about PII retention and GDPR?"

**Your answer:** "I've implemented the right-to-erasure infrastructure: `DELETE /users/me` sets `deletion_scheduled_for`, and a scheduled job processes anonymization. For DPDP compliance, the next step is defining retention periods per data type (e.g., order PII retained for 3 years for GST audit requirements, then anonymized) and building an automated anonymization pipeline."

---

## Phase 4 — Future Scope (Post Beta V1)

Tickets for after the beta launch — features, improvements, and hardening.

---

### DOPS-130: Wire real email notification provider (SendGrid)

**Priority:** P1
**Estimate:** 3 hours

Replace `log.info()` calls in `NotificationService` with actual SendGrid email delivery. Configure via `SENDGRID_API_KEY` env var with a Spring profile switch.

---

### DOPS-131: Wire real SMS notification provider (MSG91/Twilio)

**Priority:** P2
**Estimate:** 3 hours

Add SMS delivery for order confirmation and "order ready" notifications. India-focused: use MSG91 for better domestic pricing.

---

### DOPS-132: Add Razorpay subscription billing integration

**Priority:** P1
**Estimate:** 6 hours

Wire `SubscriptionController.checkout()` to Razorpay Subscriptions API. Auto-create plans in Razorpay matching STARTER/GROWTH/ENTERPRISE. Handle webhook for payment success/failure.

---

### DOPS-133: Convert PostgreSQL K8s manifest to managed DB config

**Priority:** P2
**Estimate:** 2 hours

For cloud deployment: replace `k8s/postgres.yaml` with documentation and Terraform/Helm config for AWS RDS or Google Cloud SQL. Add connection string env var config for managed DB.

---

### DOPS-134: Add Kubernetes Ingress with TLS

**Priority:** P1
**Estimate:** 2 hours

Add `k8s/ingress.yaml` with nginx Ingress Controller config. Add cert-manager annotation for Let's Encrypt TLS. Route `/api` to backend service, `/` to frontend service.

---

### DOPS-135: Add Horizontal Pod Autoscaler

**Priority:** P2
**Estimate:** 1 hour

Add `k8s/hpa.yaml`: `minReplicas: 2`, `maxReplicas: 8`, target CPU 70%. Apply to backend deployment only.

---

### DOPS-136: Add PostgreSQL backup CronJob

**Priority:** P2
**Estimate:** 2 hours

K8s CronJob that runs `pg_dump` daily and pushes to S3/GCS. 7-day retention. Update `docs/operations.md` to use `kubectl exec` instead of `docker compose exec`.

---

### DOPS-137: Migrate integration tests to Testcontainers

**Priority:** P2
**Estimate:** 4 hours

Replace H2 `create-drop` test profile with Testcontainers PostgreSQL + Redis. Flyway migrations run against real PostgreSQL in CI. Catches DB-specific bugs (UUID generation, `@SQLRestriction`, JSONB, etc.).

---

### DOPS-138: Add contract tests (OpenAPI schema validation)

**Priority:** P3
**Estimate:** 3 hours

Add `springdoc-openapi-starter-webmvc-api` to auto-generate OpenAPI spec at build time. Write a test that validates the generated spec against the frontend TypeScript types. Prevents API drift between backend and frontend.

---

### DOPS-139: Add materialized views for analytics

**Priority:** P3
**Estimate:** 3 hours

Create PostgreSQL materialized views: daily revenue per tenant, top menu items, average prep time. Refresh via `@Scheduled` job. Move analytics queries off the primary write path.

---

### DOPS-140: Add customer entity for repeat customer tracking

**Priority:** P3
**Estimate:** 4 hours

Create `customers` table with unique constraint on `(tenant_id, phone)`. Link orders to customer ID instead of raw PII fields. Enables: customer lifetime value, repeat order rate, loyalty features.

---

### DOPS-141: Add PII anonymization pipeline with retention policies

**Priority:** P2
**Estimate:** 4 hours

Define retention periods: order PII retained 3 years (GST), user PII deleted on request + 30 days. Build `@Scheduled` job that anonymizes expired PII. Add `customer_consent_marketing` field to order placement.

---

### DOPS-142: Add refund workflow

**Priority:** P2
**Estimate:** 4 hours

Add `REFUND_REQUESTED`, `REFUND_PROCESSING` to `PaymentStatus`. Build `POST /orders/{id}/refund` endpoint (SUPER_ADMIN/TENANT_ADMIN only). Integrate with Razorpay refund API. Add refund status tracking in order timeline.

---

### DOPS-143: Add support dashboard page

**Priority:** P3
**Estimate:** 6 hours

Build `SupportDashboardPage` (SUPER_ADMIN only) with search by customer phone/email/order ID/date range. Quick links to order timeline, status history, and cancel/refund actions. Bulk cancel capability.

---

### DOPS-144: Add Grafana dashboard JSON

**Priority:** P3
**Estimate:** 2 hours

Commit `k8s/monitoring/grafana-dashboard.json` with panels for: request rate, error rate, P95 latency, DB connection pool saturation, Redis hit rate, order volume per tenant.

---

### DOPS-145: Add mobile-first responsive design for public pages

**Priority:** P2
**Estimate:** 4 hours

Audit `PublicMenuPage`, `OrderConfirmPage`, `OrderStatusPage`, `OrderHistoryPage` for mobile responsiveness. These are the primary customer-facing pages, opened mostly on phones. Add proper Tailwind responsive breakpoints.

---

### DOPS-146: Add design tokens to Tailwind config

**Priority:** P3
**Estimate:** 1 hour

Define shared Tailwind theme tokens: primary/secondary colors, spacing scale, border radius, font sizes. Prevents visual inconsistency across pages as the app grows.

---

### DOPS-147: Add order status progress stepper component

**Priority:** P3
**Estimate:** 1.5 hours

Replace the plain status label on `OrderStatusPage` with a visual progress stepper: Placed → Confirmed → Preparing → Ready → Delivered. Highlight current step with animation.

---

### DOPS-148: Add accessibility audit and fixes (WCAG 2.1 AA)

**Priority:** P3
**Estimate:** 4 hours

Run axe-core audit on all pages. Fix ARIA labels, keyboard navigation, color contrast, focus management. Add `aria-label` to all icon buttons. Ensure all forms have proper labels.

---

### DOPS-149: Add chaos/fault injection testing

**Priority:** P3
**Estimate:** 4 hours

Test resilience when Redis goes down, PostgreSQL connection pool exhausted, WebSocket broker disconnects. Verify graceful degradation (cache miss → DB fallback, WebSocket fail → polling fallback).

---

### DOPS-150: Add CSRF protection for refresh token endpoint

**Priority:** P2
**Estimate:** 2 hours

The refresh token is in an HttpOnly cookie. CSRF is globally disabled. Add double-submit cookie CSRF protection specifically for `POST /auth/refresh`. `SameSite=Lax` provides partial protection but not complete.

---

### DOPS-151: Add JWT secret minimum length validation

**Priority:** P2
**Estimate:** 30 min

Add a startup check in `JwtUtils` or a `@PostConstruct` that validates `JWT_SECRET` is at least 32 characters (256 bits for HMAC-SHA256). Fail fast with a descriptive error if too short.

---

## Execution Priority for Interview Prep

### Day 1 (~3 hours) — Do These First

| # | Ticket   | What                            | Time  |
|---|----------|---------------------------------|-------|
| 1 | DOPS-120 | Fix README version mismatches   | 15m   |
| 2 | DOPS-121 | Fix CSP blocking WebSocket      | 30m   |
| 3 | DOPS-123 | Currency formatting utility     | 30m   |
| 4 | DOPS-124 | Raise JaCoCo thresholds         | 30m   |
| 5 | DOPS-122 | WebSocket authentication        | 2h    |

**Gate:** GitHub looks accurate, code review shows engineering maturity.

### Day 2 (~4 hours) — Strengthen Your Answers

| # | Ticket   | What                                | Time  |
|---|----------|-------------------------------------|-------|
| 6 | DOPS-125 | Operating hours enforcement         | 2h    |
| 7 | DOPS-126 | User deletion job                   | 1.5h  |
| 8 | DOPS-127 | Playwright Firefox in CI            | 30m   |

**Gate:** Can answer hard questions about business logic and compliance.

### Day 3 (~2 hours) — Polish

| # | Ticket   | What                          | Time  |
|---|----------|-------------------------------|-------|
| 9 | DOPS-128 | Zustand cart migration        | 1.5h  |
| 10| -        | Review Phase 3 talking points | 30m   |

**Gate:** Ready for interview.

---

## What to Demo in an Interview

1. **Public customer flow:** Open `PublicMenuPage` → browse menu → add to cart → place order → see real-time status on `OrderStatusPage`
2. **Kitchen staff flow:** Log in as STAFF → Kitchen Kanban shows new order in real-time (WebSocket) → drag/update status → customer page updates live
3. **Restaurant admin flow:** Log in as TENANT_ADMIN → Dashboard with analytics → Menu management → Inventory → Table management
4. **Multi-tenancy:** Show how two restaurants have completely isolated data, how `TenantAuthorizationFilter` prevents cross-tenant access
5. **GitHub:** Point out branch strategy, CI pipeline, SonarCloud badge, PR template, issue template, commit history

## What to Highlight in Code Review

1. **Security:** In-memory token store (not localStorage), HttpOnly refresh cookie, tenant isolation filter, rate limiting, account lockout, AOP audit logging
2. **Architecture:** Clean DTO layer (no entities in API), Flyway migrations, `@SQLRestriction` soft deletes, structured JSON logging with MDC correlation
3. **Testing:** 3 layers (unit → integration → E2E), k6 load tests, JaCoCo + SonarCloud
4. **DevOps:** Multi-stage Docker builds, non-root container, K8s manifests with resource limits, Prometheus metrics
