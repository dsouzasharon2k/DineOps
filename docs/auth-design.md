# PlatterOps – Auth Design & Roles

## Roles

| Role | Description |
|------|-------------|
| `SUPER_ADMIN` | Platform owner. Can create/manage restaurants and all users. |
| `TENANT_ADMIN` | Restaurant owner. Can manage their own restaurant, menu, staff. |
| `STAFF` | Restaurant staff. Can view/manage orders for their restaurant only. |
| `CUSTOMER` | End customer. Can browse menus and place orders. |

## Login Flow

1. Client sends `POST /api/v1/auth/login` with email + password
2. Server validates credentials against the `users` table
3. Server returns a signed JWT containing: `userId`, `email`, `role`, `tenantId`
4. Client attaches JWT to all subsequent requests: `Authorization: Bearer <token>`
5. Server validates JWT on every protected request via a filter

## Tenant Isolation

- Every user except `SUPER_ADMIN` belongs to a restaurant (`tenant_id` in the `users` table)
- All data queries filter by `tenant_id` — a `TENANT_ADMIN` can never see another restaurant's data
- `SUPER_ADMIN` has no `tenant_id` and can see all data

## Public Endpoints (no auth required)

- `POST /api/v1/auth/login`
- `GET /api/v1/restaurants`
- Swagger UI (`/swagger-ui/**`, `/v3/api-docs/**`)

## Protected Endpoints

- `SUPER_ADMIN` only: create/delete restaurants, manage all users
- `TENANT_ADMIN` only: manage their menu, staff, view their orders
- `STAFF`: view and update orders for their tenant
- `CUSTOMER`: browse menu, place/view own orders