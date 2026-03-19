# k6 Load & Smoke Testing

## Prerequisites
- `k6` installed locally (or run k6 in CI)
- Backend running and reachable from the machine/network running k6

## Required environment variable
- `K6_BASE_URL`: base URL to the backend API prefix (must include `/api/v1`)
  - Example: `http://localhost:8080/api/v1`

## Smoke test
```bash
K6_BASE_URL=http://localhost:8080/api/v1 k6 run k6/smoke-test.js
```

## Load test
```bash
K6_BASE_URL=http://localhost:8080/api/v1 k6 run k6/load-test.js
```

## CI/Jenkins note
If your CI runs backend on a different host/port, set `K6_BASE_URL` accordingly so both scripts:
- hit menu/order endpoints under `/api/v1`
- hit health endpoint at `${K6_BASE_URL%/api/v1}/actuator/health`

