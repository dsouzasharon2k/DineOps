# PlatterOps Execution Board (Owner-Action Focus)

This board converts the roadmap into executable delivery slices mapped to current PlatterOps backend/frontend structure.

---

## 0) Scope and Release Plan

- **MVP (4 weeks):** Profit + wastage + menu engineering + alerts
- **V2 (6-8 weeks):** Staffing optimization + customer behavior
- **V3 (8-12 weeks):** Forecasting + integrations + accounting/compliance exports

---

## 1) Current System Mapping (Baseline)

### Existing tables (already in project)
- `restaurants`, `users`
- `menu_categories`, `menu_items`
- `orders`, `order_items`, `order_status_history`
- `inventory`, `subscriptions`, `reviews`, `audit_log`, `dining_tables`

### Existing backend modules (already in project)
- `analytics` (`AnalyticsService`)
- `order` (`OrderService`)
- `menu` (`MenuItemService`, `MenuCategoryService`)
- `inventory`
- `subscription`

### Existing frontend dashboard pages
- `DashboardHome`, `MenuPage`, `KitchenPage`, `InventoryPage`, `ReviewsPage`, `TicketsPage`
- `SuperAdminDashboardPage`

---

## 2) MVP Delivery Board (4 Weeks)

## Epic MVP-1: Daily Profitability Engine

- **Outcome:** Owner sees actual daily profit (not only revenue).
- **Priority:** P0

### Story MVP-1.1: Add operating expense tracking
- **As** a restaurant owner  
  **I want** to log non-food daily expenses  
  **So that** profit calculation is realistic.
- **Backend touchpoints:**
  - Add migration: `backend/src/main/resources/db/migration/V24__owner_profit_foundation.sql`
  - New table: `expense_entries`
    - columns: `id`, `tenant_id`, `expense_date`, `category`, `amount`, `notes`, timestamps
  - New module: `backend/src/main/java/com/dineops/finance/*`
- **Frontend touchpoints:**
  - New page: `frontend/src/pages/dashboard/FinancePage.tsx`
  - Nav entry in `DashboardLayout.tsx`
- **Acceptance criteria:**
  - Owner can add/edit/delete expense entries.
  - Expense list scoped by tenant.
  - API returns totals by day and category.

### Story MVP-1.2: Daily P&L aggregation
- **As** an owner  
  **I want** one daily P&L card  
  **So that** I know if I made money today.
- **Backend touchpoints:**
  - Extend `AnalyticsService` or add `ProfitabilityService`.
  - Materialized view or query view:
    - `vw_tenant_daily_profit` (revenue, cogs estimate, non-food expenses, net profit)
- **Frontend touchpoints:**
  - `DashboardHome.tsx` or dedicated owner analytics section.
- **Acceptance criteria:**
  - Shows `Revenue`, `Estimated COGS`, `Expenses`, `Net Profit`.
  - Numbers are consistent with seeded demo data.

---

## Epic MVP-2: Inventory Wastage Control

- **Outcome:** Owner sees wastage in value terms and fix suggestions.
- **Priority:** P0

### Story MVP-2.1: Wastage events
- **As** a manager  
  **I want** to log wastage events with reason  
  **So that** loss is measurable.
- **Backend touchpoints:**
  - Migration in `V24__owner_profit_foundation.sql` (or separate `V25__wastage.sql`)
  - New table: `wastage_events`
    - `tenant_id`, `item_name`/`inventory_item_id`, `qty`, `unit_cost`, `reason`, timestamps
  - Service/controller: `com.dineops.inventory` extensions
- **Frontend touchpoints:**
  - Extend `InventoryPage.tsx` with “Log wastage” flow.
- **Acceptance criteria:**
  - Wastage can be logged and listed by day/week.
  - Dashboard shows total waste loss amount.

### Story MVP-2.2: Waste alerts
- **As** an owner  
  **I want** alerts when waste spikes  
  **So that** I can intervene immediately.
- **Backend touchpoints:**
  - Alert evaluator job/service.
  - Threshold config per tenant.
- **Frontend touchpoints:**
  - `DashboardHome.tsx` action cards.
- **Acceptance criteria:**
  - Spike alert generated if waste > trailing baseline threshold.

---

## Epic MVP-3: Menu Engineering (Stars/Dogs/Cash Cows/Traps)

- **Outcome:** Owner gets menu decisions, not raw lists.
- **Priority:** P0

### Story MVP-3.1: Item profitability + popularity score
- **As** an owner  
  **I want** each menu item classified by margin and demand  
  **So that** I can promote/remove items confidently.
- **Backend touchpoints:**
  - Add optional fields to `menu_items`:
    - `is_vegan` boolean default false
    - `base_cost` bigint (paise/cents)
  - Aggregation view: `vw_item_engineering`
    - order count, revenue, margin, quadrant label
- **Frontend touchpoints:**
  - New section/page: `MenuInsightsPage.tsx` or in `MenuPage.tsx`.
- **Acceptance criteria:**
  - Items appear in one of 4 quadrants.
  - Top recommendations auto-generated (promote/reprice/remove).

### Story MVP-3.2: “What to do today” recommendations
- **As** an owner  
  **I want** 3-5 clear actions with projected impact  
  **So that** I can act fast.
- **Backend touchpoints:**
  - Recommendation engine service (rule-based v1).
  - DTO: `ActionRecommendationResponse`.
- **Frontend touchpoints:**
  - `DashboardHome.tsx` top “Actions Today” module.
- **Acceptance criteria:**
  - At least 3 actions shown with rationale + estimated impact.

---

## Epic MVP-4: Alerts and Digest

- **Outcome:** proactive app behavior.
- **Priority:** P0

### Story MVP-4.1: Alert center
- **As** an owner  
  **I want** a centralized alert feed  
  **So that** I don’t miss issues.
- **Backend touchpoints:**
  - New table: `alerts`
    - `tenant_id`, `severity`, `type`, `message`, `action_hint`, `is_read`, timestamps
  - Alert APIs.
- **Frontend touchpoints:**
  - New page: `AlertsPage.tsx`
  - Sidebar option under tenant main nav.
- **Acceptance criteria:**
  - Alerts can be listed/read/filtered by severity.

### Story MVP-4.2: Daily summary
- **As** an owner  
  **I want** a compact daily summary  
  **So that** I can review business in 2 minutes.
- **Backend touchpoints:**
  - Daily digest endpoint.
- **Frontend touchpoints:**
  - Dashboard banner.
- **Acceptance criteria:**
  - Includes profit, waste, top risk, top opportunity.

---

## 3) V2 Board (Staffing + Customer Behavior)

## Epic V2-1: Staffing Optimization
- Add tables: `staff_shifts`, `attendance_logs`, `labor_cost_entries`
- KPIs: labor cost %, sales per labor hour, shift overstaff alerts
- UI: `StaffInsightsPage.tsx`
- Acceptance:
  - Shift-level efficiency chart
  - recommended staff adjustment by time block

## Epic V2-2: Customer Behavior Insights
- Add views:
  - repeat vs new customer split
  - AOV trend
  - item affinity/combos
- UI:
  - `CustomerInsightsPage.tsx`
- Acceptance:
  - at least 2 bundle recommendations
  - repeat-customer impact on revenue visible

---

## 4) V3 Board (Forecast + Integrations + Compliance)

## Epic V3-1: Demand Forecasting
- Forecast service for daypart/item demand.
- Prep guidance card (“prepare X units by 6PM”).
- Acceptance:
  - forecast endpoint returns next-day quantity suggestions.

## Epic V3-2: Integrations
- POS import adapters
- Aggregator order sync adapter
- Procurement/vendor data import
- Acceptance:
  - one-way sync works for at least one external source per category.

## Epic V3-3: Accounting/Compliance Export
- GST export endpoints
- monthly P&L export CSV/XLSX
- CA-ready report templates
- Acceptance:
  - downloadable report by month and tenant.

---

## 5) Super Admin Track (Parallel)

Super admin should focus on platform health:
- Restaurant-wise revenue leaderboard
- Subscriber vs non-subscriber conversion
- Support tickets SLA
- Review moderation queue

### Existing pages to extend
- `SuperAdminDashboardPage.tsx`
- `TicketsPage.tsx`
- `ReviewsPage.tsx`

### Add next
- `PlatformSupportPage.tsx` (SLA + assignment)
- `ReviewModerationPage.tsx` (flag/review actions)

---

## 6) Suggested Migration Sequence

1. `V24__owner_profit_foundation.sql`
   - `expense_entries`, `wastage_events`, `alerts`, optional `menu_items.is_vegan`, `menu_items.base_cost`
2. `V25__reporting_views_owner_actions.sql`
   - `vw_tenant_daily_profit`, `vw_item_engineering`, `vw_owner_action_feed`
3. `V26__staffing_customer_insights.sql`
4. `V27__forecasting_accounting_exports.sql`

---

## 7) Sprint Definition of Done

A story is done only when:
- API contract documented
- tenant authorization enforced
- UI error/loading/empty states included
- seed/demo data supports the scenario
- tests added (service + endpoint + critical UI state)
- dashboard output is actionable (not raw-only)

---

## 8) MVP Exit Criteria (Go/No-Go)

Ship MVP only when all are true:
- Owner can view daily net profit
- Owner can view waste loss and receive waste alerts
- Menu engineering shows quadrants with recommended actions
- “Actions Today” feed gives clear high-impact tasks
- At least 1 week of realistic demo data validates signals

