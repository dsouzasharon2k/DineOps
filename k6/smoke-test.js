import http from 'k6/http';
import { check } from 'k6';

// Smoke test - 1 user, 1 iteration, just verify everything works
export const options = {
  vus: 1,
  iterations: 1,
};

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1';
// K6_BASE_URL should point at the API prefix (including `/api/v1`)
// Example: K6_BASE_URL=http://localhost:8080/api/v1
const API_BASE_URL = (__ENV.K6_BASE_URL || DEFAULT_API_BASE_URL).replace(/\/$/, '');
// Health endpoint lives at the service root (not under /api/v1)
const API_ORIGIN = API_BASE_URL.endsWith('/api/v1')
  ? API_BASE_URL.slice(0, -'/api/v1'.length)
  : API_BASE_URL.replace(/\/api\/v\d+$/, '');

const TENANT_ID = 'a085284e-ca00-4f64-a2c7-42fc0572bb97';
const MENU_ITEM_ID = 'd757a274-4519-4737-80ab-11e79e6e0f64';

export default function () {
  // 1. Health check
  const health = http.get(`${API_ORIGIN}/actuator/health`);
  check(health, { 'Health UP': (r) => r.status === 200 });

  // 2. Get categories
  const cats = http.get(`${API_BASE_URL}/restaurants/${TENANT_ID}/categories`);
  check(cats, {
    'Categories 200': (r) => r.status === 200,
    'Has categories': (r) => JSON.parse(r.body).length > 0,
  });

  // 3. Place order
  const order = http.post(
    `${API_BASE_URL}/orders`,
    JSON.stringify({
      tenantId: TENANT_ID,
      notes: 'smoke test',
      items: [{ menuItemId: MENU_ITEM_ID, quantity: 1 }]
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(order, {
    'Order placed 201': (r) => r.status === 201,
    'Order has ID': (r) => JSON.parse(r.body).id !== undefined,
    'Order is PENDING': (r) => JSON.parse(r.body).status === 'PENDING',
  });

  // 4. Track order
  if (order.status === 201) {
    const orderId = JSON.parse(order.body).id;
    const track = http.get(`${API_BASE_URL}/orders/${orderId}`);
    check(track, { 'Track order 200': (r) => r.status === 200 });
  }
}
