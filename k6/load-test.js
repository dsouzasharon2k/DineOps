import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// Custom metrics
const errorRate = new Rate('error_rate');
const orderDuration = new Trend('order_placement_duration');

// Test configuration - 3 stages: ramp up, sustain, ramp down
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp up to 10 users
    { duration: '1m',  target: 10 },  // hold at 10 users for 1 minute
    { duration: '30s', target: 0  },  // ramp down
  ],
  thresholds: {
    // 95% of requests must complete within 500ms
    http_req_duration: ['p(95)<500'],
    // Error rate must stay below 5%
    error_rate: ['rate<0.05'],
    // Order placement must complete within 1 second
    order_placement_duration: ['p(95)<1000'],
  },
};

// Test data
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

// Helper - check response and track errors
function checkResponse(res, name) {
  const success = check(res, {
    [`${name} status 200`]: (r) => r.status === 200,
    [`${name} duration < 500ms`]: (r) => r.timings.duration < 500,
  });
  errorRate.add(!success);
  return success;
}

export default function () {
  const headers = { 'Content-Type': 'application/json' };

  // --- Scenario 1: Browse menu (most common operation) ---
  const categoriesRes = http.get(
    `${API_BASE_URL}/restaurants/${TENANT_ID}/categories`,
    { tags: { name: 'get_categories' } }
  );
  checkResponse(categoriesRes, 'Get Categories');
  sleep(0.5);

  // --- Scenario 2: Get menu items ---
  if (categoriesRes.status === 200) {
    const categories = JSON.parse(categoriesRes.body);
    if (categories.length > 0) {
      const catId = categories[0].id;
      const itemsRes = http.get(
        `${API_BASE_URL}/restaurants/${TENANT_ID}/categories/${catId}/items`,
        { tags: { name: 'get_items' } }
      );
      checkResponse(itemsRes, 'Get Menu Items');
      sleep(0.5);
    }
  }

  // --- Scenario 3: Place an order ---
  const orderPayload = JSON.stringify({
    tenantId: TENANT_ID,
    notes: 'k6 load test order',
    items: [
      { menuItemId: MENU_ITEM_ID, quantity: 1 }
    ]
  });

  const orderStart = Date.now();
  const orderRes = http.post(
    `${API_BASE_URL}/orders`,
    orderPayload,
    { headers, tags: { name: 'place_order' } }
  );
  orderDuration.add(Date.now() - orderStart);

  const orderSuccess = check(orderRes, {
    'Place Order status 201': (r) => r.status === 201,
    'Place Order has id': (r) => JSON.parse(r.body).id !== undefined,
  });
  errorRate.add(!orderSuccess);
  sleep(1);

  // --- Scenario 4: Track order status ---
  if (orderRes.status === 201) {
    const orderId = JSON.parse(orderRes.body).id;
    const trackRes = http.get(
      `${API_BASE_URL}/orders/${orderId}`,
      { tags: { name: 'track_order' } }
    );
    checkResponse(trackRes, 'Track Order');
    sleep(0.5);
  }
}

// Summary printed after test completes
export function handleSummary(data) {
  return {
    'k6/summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
