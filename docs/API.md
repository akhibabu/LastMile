# API reference

Base URL (local): `http://localhost:4000/api`  
Auth: HTTP-only `access_token` cookie set by login/register. Send requests with credentials. No JWT is returned in JSON.  
Interactive: `http://localhost:4000/api/docs`

Envelope:

```json
{ "success": true, "data": {}, "message": "OK" }
```

Error:

```json
{ "success": false, "message": "No active rate card found ...", "code": "MISSING_RATE_CARD", "errors": [] }
```

## Auth

### POST `/auth/register`

- Auth: none
- Role: creates CUSTOMER
- Body: `{ name, email, phone, password, address?, city?, pincode? }`
- Role is always `CUSTOMER`; a `role` field in the body is rejected
- 201: `{ user }` (user has no `passwordHash`). Sets HTTP-only `access_token` cookie.
- 409: email already registered

### POST `/auth/logout`

- Auth: none required
- 200: `{ loggedOut: true }` — clears the HTTP-only `access_token` cookie

### POST `/auth/login`

- Auth: none
- Body: `{ email, password }`
- 200: `{ user }` plus HTTP-only `access_token` cookie. JWT is not included in JSON.
- 401: invalid credentials

### GET `/auth/me`

- Auth: cookie
- 200: current user including profiles
- 401: missing/invalid token

## Orders

### POST `/orders/preview-price`

- Role: any authenticated
- Body: pickup/drop address + required 6-digit pincodes, length, breadth, height, actualWeight, orderType (`B2B`|`B2C`), paymentType (`PREPAID`|`COD`)
- 200: pricing breakdown (zones, weights, charges, resolved pickup/drop). Does **not** persist an order.
- 422: `ZONE_UNRESOLVED`, `ADDRESS_PINCODE_MISMATCH`, or `MISSING_RATE_CARD`

### POST `/orders`

- Role: CUSTOMER, ADMIN
- Body: same as preview; ADMIN may send `customerId`
- 201: order with status `CREATED`
- 422: same as preview

### GET `/orders`

- CUSTOMER: own orders. AGENT: assigned. ADMIN: all.
- Query: `status`, `zoneId`, `agentId`, `orderType`, `paymentType`, `customerId` (admin)

### GET `/orders/:id`

- Role: owner / assigned agent / admin
- 404 if missing, 403 if forbidden

### GET `/orders/:id/tracking`

- Timeline + attempts (history is append-only)

### POST `/orders/:id/assign`

- Role: ADMIN
- Body: `{ agentId }`
- 422: `AGENT_UNAVAILABLE`, `INVALID_STATUS`

### POST `/orders/:id/auto-assign`

- Role: ADMIN
- 200: `{ order, assignment: { agent, distanceKm, reason } }`
- 422: `NO_AVAILABLE_AGENT`

### POST `/orders/:id/unassign`

- Role: ADMIN
- Allowed before pickup

### POST `/orders/:id/status`

- Role: AGENT (state machine), ADMIN (`override: true` skips the machine)
- Body: `{ status, note?, reason?, override? }`
- FAILED requires `reason`
- 422: `INVALID_TRANSITION`, `FAILURE_REASON_REQUIRED`

### POST `/orders/:id/reschedule`

- Role: CUSTOMER (own failed order), ADMIN
- Body: `{ scheduledDeliveryDate, note? }`
- 422 if status is not FAILED

## Agents

### GET `/agents` — ADMIN
### GET `/agents/available` — ADMIN
### GET `/agents/me` — AGENT
### POST `/agents` — ADMIN `{ name, email, password, phone?, currentZoneId?, currentLatitude?, currentLongitude? }`
### PATCH `/agents/me/location` — AGENT `{ latitude, longitude }` (agent is taken from the session)
### PATCH `/agents/:id/location` — ADMIN `{ latitude, longitude, zoneId? }`
### PATCH `/agents/:id/availability` — `{ isAvailable, status? }`

## Zones

### GET `/zones`
### GET `/zones/lookup?pincode=` — resolve a mapped pincode
### GET `/locations` — list localities from `ZoneArea` (`q` optional)
### GET `/locations/search?q=` — search area, city, pincode, or zone

Each location: `{ id, area, city, state, pincode, zoneId, zoneName, zoneCode, isActive }`
`isActive` follows the parent zone. Inactive localities are returned so the UI can show a coming-soon state.
### POST `/zones` — ADMIN `{ name, code, description?, active?, centroidLat?, centroidLng? }`
### PUT `/zones/:id` — ADMIN
### DELETE `/zones/:id` — ADMIN (deactivates)
### POST `/zones/:id/areas` — ADMIN `{ pincode?, areaName?, city?, latitude?, longitude? }`
### DELETE `/zones/:id/areas/:areaId` — ADMIN

## Rate cards

### GET `/rate-cards` — ADMIN, CUSTOMER
### POST `/rate-cards` — ADMIN
### PUT `/rate-cards/:id` — ADMIN
### DELETE `/rate-cards/:id` — ADMIN

Body fields: `name`, `orderType`, `rateScope`, `isFallback?`, `sourceZoneId?`, `destinationZoneId?`, `baseRate`, `perKgRate`, `minimumChargeableWeight?`, `volumetricDivisor?`, `codSurcharge?`, `active?`

Exact cards require both zones. Fallback cards set `isFallback: true` and omit zones.

## Notifications

### GET `/notifications`

- Customer/agent: own inbox
- Admin: all logged/sent/failed messages

### POST `/notifications/:id/retry` — ADMIN

Retries a `FAILED` email on the same notification row.

### GET `/config`

Public runtime config: `locationUpdateIntervalMs`, `locationStaleThresholdMs`, `appName`.

## Admin

### GET `/admin/dashboard` — metrics for the current role (admin aggregates, customer counts, agent assignment counts)
### GET `/admin/customers` — ADMIN

## Common error codes

| Code | When |
| --- | --- |
| UNAUTHORIZED | Missing/invalid JWT |
| FORBIDDEN | Wrong role |
| VALIDATION_ERROR | Zod failure |
| ZONE_UNRESOLVED | Address not mapped |
| MISSING_RATE_CARD | No active card for type/scope/zones |
| INVALID_TRANSITION | Illegal status jump |
| FAILURE_REASON_REQUIRED | FAILED without reason |
| NO_AVAILABLE_AGENT | Auto-assign found nobody |
| AGENT_UNAVAILABLE | Manual assign rejected |
