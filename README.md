# LastMile — Last-Mile Delivery Management Platform

A complete, demo-ready logistics platform with customer, delivery-agent, and admin roles. Orders are priced from configurable zone mappings and rate cards (not hardcoded), assigned to the nearest available agent, tracked with an immutable status history, and notified over transactional email.

## 1. Project Overview

LastMile lets a customer (or admin) enter pickup/drop addresses, package dimensions, weight, B2B/B2C, and Prepaid/COD. The platform resolves zones, computes volumetric and billable weight, selects the matching rate card, shows a full price breakdown, and only then creates the order. Admins assign agents manually or automatically. Agents walk the delivery state machine. Failed deliveries can be rescheduled without losing history.

## 2. Features

- JWT authentication in an HTTP-only cookie, with role-based access (CUSTOMER / AGENT / ADMIN)
- Configurable zones with pincode and area mappings stored in PostgreSQL
- Configurable exact-route and explicit fallback rate cards for B2B/B2C × intra/inter-zone, including COD surcharge
- Price preview before confirmation (`POST /api/orders/preview-price`)
- Volumetric weight = (L × B × H) / 5000; billable = max(actual, volumetric)
- Manual assignment, auto-assignment (fresh location + Haversine nearest agent, zone fallback)
- Near-real-time agent location from the browser, with stale-location handling
- Immutable `OrderStatusHistory` (append-only)
- Failed delivery reasons, reschedule requests, delivery attempts
- Transactional email via Resend, with a development log fallback
- Customer, agent, and admin dashboards with server-side metrics
- Swagger UI at `/api/docs`

## 3. Architecture

```
frontend (React + Vite)  -->  REST / HTTP-only cookie JWT  -->  backend (Express)
                                                 |
                                                 +-- services (pricing, assignment, tracking, notifications, email, location)
                                                 +-- Prisma / PostgreSQL
                                                 +-- Nominatim geocoding (optional)
                                                 +-- EmailService → ResendProvider | development logger
```

Business logic lives in services, not route files. Pricing, assignment, and tracking each have a dedicated service plus a pure function module under `backend/src/lib` that is unit-tested without a database.

## 4. Tech Stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query |
| Backend | Node.js, Express 5, TypeScript, Zod, JWT, bcryptjs, Pino |
| Database | PostgreSQL 16 + Prisma ORM |
| Email | Resend, with development log fallback |
| Maps | OpenStreetMap Nominatim |
| Deploy | Frontend → Vercel; Backend → Render/Railway; DB → Neon/Supabase |

## 5. Folder Structure

```
unthinkable/
  docker-compose.yml          # local PostgreSQL
  frontend/                   # Vite React app
  backend/
    prisma/schema.prisma
    prisma/seed.ts
    src/lib/                  # pure pricing, assignment, tracking
    src/services/             # domain services
    src/controllers/ routes/ middleware/ validators/
    src/__tests__/
  SYSTEM_DESIGN.md
  README.md
```

## 6. Environment Variables

See `.env.example`. Backend reads `backend/.env`. Frontend reads `frontend/.env`.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Signing secret (min 16 chars) |
| `JWT_EXPIRES_IN` | Token lifetime, default `7d` |
| `FRONTEND_URL` | CORS origin allowlist (comma-separated) |
| `BACKEND_URL` | Public API URL |
| `RESEND_API_KEY` | Resend API key. When set, emails are sent. |
| `FROM_EMAIL` | Sender address |
| `FROM_NAME` | Sender display name |
| `LOCATION_UPDATE_INTERVAL` | Agent location throttle in ms, default `30000` |
| `LOCATION_STALE_THRESHOLD` | Fresh-location window in ms, default `300000` |
| `GEOCODING_USER_AGENT` | Nominatim user agent |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | Optional first admin |
| `VITE_API_URL` | Frontend API base, e.g. `http://localhost:4000/api` |

If `RESEND_API_KEY` is absent in development, the email is logged and stored as `Notification.status = LOGGED` (never `SENT`). In production a missing key records `FAILED` and does not fail the order.

## 7. Local Setup

Prerequisites: Node.js 20+, Docker (for Postgres) or any PostgreSQL 14+.

```bash
git clone <this-repo>
cd unthinkable
npm install
cp .env.example backend/.env   # already created for local demo
docker compose up -d db
npm run db:migrate -w backend
npm run db:seed -w backend
npm run dev
```

- API: http://localhost:4000
- Swagger: http://localhost:4000/api/docs
- Web: http://localhost:5173

## 8. Database Setup

```bash
docker compose up -d db
cd backend
npx prisma migrate deploy    # or: npm run db:migrate
npx prisma generate
npm run db:seed
```

Hosted Postgres (Neon/Supabase): set `DATABASE_URL` to the pooled or direct URL (Prisma migrate prefers the **direct** URL) and run `npx prisma migrate deploy`.

## 9. Seed Data

`backend/prisma/seed.ts` creates:

- Hyderabad zones `HYD_WEST`, `HYD_CENTRAL`, `HYD_EAST`, `HYD_NORTH`, `HYD_SOUTH` with realistic pincode/area maps (for example `500084` Gachibowli and `500081` Hitech City / Madhapur both in `HYD_WEST`; `500018` is Santoshnagar in `HYD_SOUTH`, not Hitech City)
- B2B and B2C exact zone-pair rate cards for every Hyderabad zone pair (divisor 5000, COD surcharges). Explicit fallback cards can be added by an admin; none are hardcoded.

It does **not** create a customer account. Sign up from the UI with your own name, email, and password.

An admin is created only when both `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set. If they are omitted, seeding skips admin creation rather than inventing a default password.

Agents are created by a logged-in admin from **Agents → Add agent**, not by the seed script.

## 10. Authentication

- `POST /api/auth/register` — always creates role `CUSTOMER` from the submitted name/email/phone/password (bcrypt hash). Extra fields such as `role` are rejected. Sets an HTTP-only `access_token` cookie and returns `{ user }` only.
- `POST /api/auth/login` — looks up the email, compares bcrypt hashes, sets the HTTP-only cookie, returns `{ user }` (no JWT in JSON)
- `POST /api/auth/logout` — clears the cookie
- `GET /api/auth/me` — cookie-authenticated; returns the stored profile (never `passwordHash`)
- Admins create agents via `POST /api/agents` with the agent's real name, email, and password
- Authorization is enforced on the API from the verified cookie. The UI role is never trusted. Customers cannot set `customerId` on create — it is taken from the JWT. CORS uses `credentials: true` and a configured origin list, never `*`.

## 11. API Documentation

Interactive docs: **http://localhost:4000/api/docs** (OpenAPI JSON at `/api/docs.json`).

A compact reference is in [docs/API.md](docs/API.md). Common pattern:

```json
{ "success": true, "data": {}, "message": "OK" }
```

Errors:

```json
{ "success": false, "message": "...", "code": "MISSING_RATE_CARD", "errors": [] }
```

## 12. Pricing Calculation Logic

1. Resolve pickup and drop zones from the **6-digit pincode** in `ZoneArea` (`ZoneResolutionService`). Unmapped pincodes fail; address/area text that belongs to a different zone fails with `ADDRESS_PINCODE_MISMATCH`.
2. `volumetricWeight = (length × breadth × height) / volumetricDivisor` (default **5000**, stored on the rate card).
3. `billableWeight = max(actualWeight, volumetricWeight, minimumChargeableWeight)`.
4. Scope is `INTRA_ZONE` if pickup zone == drop zone, else `INTER_ZONE`.
5. Select an **active** rate card: exact source/destination zone pair first, then an administrator-configured intra/inter-zone fallback. Never a hidden hardcoded rate.
6. `shippingCharge = baseRate + (billableWeight × perKgRate)`.
7. COD surcharge from the rate card if `paymentType == COD`, else 0.
8. `totalCharge = shippingCharge + codSurcharge`.

If neither an exact card nor an explicit fallback exists, the API returns `422 MISSING_RATE_CARD` ("Pricing isn't available for this route yet.") and **does not** create an order or invent a price. The quote includes `resolutionType`: `EXACT_ZONE_PAIR`, `INTRA_ZONE_FALLBACK`, or `INTER_ZONE_FALLBACK`.

**Worked example** (seeded B2C intra-zone COD, 100×100×100 cm, 10 kg, Gachibowli `500084` → Hitech City `500081`, both `HYD_WEST`):

- Volumetric = 1,000,000 / 5000 = **200 kg**
- Billable = max(10, 200) = **200 kg**
- Shipping = 55 + 200 × 10 = **2055**
- COD = **40**
- Total = **₹2,095.00**
- Rate card = `B2C HYD_WEST → HYD_WEST`

## 13. Zone Detection Approach

`ZoneResolutionService` (configurable in admin UI, stored as `ZoneArea` rows):

1. Normalize the 6-digit pincode (authoritative).
2. Look up `ZoneArea.pincode` on an **active** zone.
3. If the address/area text matches a locality mapped to a **different** zone, reject with `ADDRESS_PINCODE_MISMATCH`.
4. Return zone id, code, name, matched pincode, and area.

Unmapped pincodes fail with `ZONE_UNRESOLVED`. The service does **not** guess a nearest city.

## 14. Auto Assignment Logic

`AssignmentService.assignNearestAgent(orderId)`:

1. Eligible = `AVAILABLE` + `isAvailable` + `activeOrderCount < maxActiveOrders`.
2. Prefer agents with a **fresh** location (`locationUpdatedAt` within `LOCATION_STALE_THRESHOLD`).
3. If pickup and a fresh agent have coordinates → minimum Haversine distance (ties broken by agent id).
4. Else same `currentZoneId` as pickup zone.
5. Else any eligible agent (stable id sort).
6. Stale coordinates are not used for nearest-agent ranking.
7. Order → `ASSIGNED`, agent → `BUSY`, history records the reason, distance, and whether the location was fresh.

Admin can also pick an agent manually or unassign before pickup.

## 15. Failed Delivery Flow

1. Agent on `OUT_FOR_DELIVERY` chooses **Mark failed** and a required reason.
2. Status `FAILED`, new `DeliveryAttempt`, history row, customer email.
3. Customer picks a new datetime → `RescheduleRequest` + attempt `RESCHEDULED` + status `RESCHEDULED`.
4. System auto-assigns the nearest available agent again (`ASSIGNED`).
5. Original failed attempt remains; a later `SUCCESS` attempt is a new row.

## 16. Notification System

`NotificationService` → `EmailService` → `ResendProvider`. Order events (`ORDER_CREATED`, `ORDER_ASSIGNED`, `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `DELIVERED`, `FAILED`, `RESCHEDULED`) send a templated customer email. Statuses: `PENDING`, `SENT` (Resend confirmed), `LOGGED` (development fallback), `FAILED` (provider or production misconfiguration). Admins can retry failed emails without creating a new order event.

## 17. Testing

```bash
npm test
```

Coverage (Vitest, no live DB required):

- Pricing: volumetric, billable, intra/inter, B2B/B2C, prepaid/COD, exact vs fallback, missing card, breakdown
- Assignment: nearest fresh agent, stale-location handling, exclusions, same-zone fallback, none available
- Email templates and cookie expiry parsing
- Tracking: valid/invalid transitions, admin override, append-only history API
- Failed delivery: reason required, FAILED→RESCHEDULED→ASSIGNED, attempt retention

## 18. Deployment (Render + Vercel)

The GitHub repo is [akhibabu/LastMile](https://github.com/akhibabu/LastMile). Production auth uses an HTTP-only cookie, so the frontend origin and API URL must match the live hosts.

### 1. Postgres (Neon)

1. Create a project at [neon.tech](https://neon.tech).
2. Copy the connection string (use the **direct** host for migrations, not the pooled `-pooler` host if Prisma migrate fails).
3. Keep it for `DATABASE_URL` on Render.

### 2. Backend (Render)

1. [New → Blueprint](https://dashboard.render.com/select-repo?type=blueprint) and select `akhibabu/LastMile`, or **New Web Service** → that repo.
2. If creating the service manually:
   - Root directory: `backend`
   - Runtime: Node
   - Build: `npm install && npx prisma generate && npm run build`
   - Start: `npx prisma migrate deploy && npm start`
   - Health check: `/health`
3. Environment:

| Variable | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon connection string |
| `JWT_SECRET` | long random string (Render can generate) |
| `JWT_EXPIRES_IN` | `7d` |
| `FRONTEND_URL` | `https://<your-vercel-app>.vercel.app` (no trailing slash) |
| `BACKEND_URL` | `https://<your-render-service>.onrender.com` |
| `RESEND_API_KEY` | optional; leave blank to record emails as `FAILED` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | optional first admin |

4. Deploy. Open `https://<service>.onrender.com/health` — it should return `{ "success": true }`.
5. Seed once from the Render shell: `npm run db:seed`.

### 3. Frontend (Vercel)

1. [Import the same repo](https://vercel.com/new) on Vercel.
2. Root directory: `frontend`.
3. Framework: Vite. Build: `npm run build`. Output: `dist`.
4. Environment (Production):

| Variable | Value |
| --- | --- |
| `VITE_API_URL` | `https://<your-render-service>.onrender.com/api` |

5. Deploy. Copy the Vercel URL into Render `FRONTEND_URL`, then **Manual Deploy** the API once so CORS and cookies allow that origin.

### 4. Check

- Vercel site loads.
- Sign up / log in. In DevTools → Application → Cookies on the **API host**, `access_token` is HTTP-only. Nothing JWT-like is in `localStorage`.
- Create-order locality list loads.
- Preview Gachibowli `500084` → Hitech City `500081` still prices ₹2,095.00.

Do not hardcode localhost in production env vars. Render free web services sleep after idle traffic; the first request after sleep can take ~30s.

## 19. Sample Credentials

There is **no** built-in customer login. Open **Sign up**, enter your own details, and use those credentials.

Admin (optional, only if you set seed env vars):

| Role | How to create |
| --- | --- |
| Customer | Public `/register` form |
| Admin | `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` then `npm run db:seed` |
| Agent | Admin dashboard → Agents → Add agent |

Demo path: register as a customer → create B2C COD Gachibowli `500084` → Hitech City `500081` → preview ₹2,095.00 (200 kg billable) → confirm → login as admin → auto-assign (after creating an available agent) → agent walks statuses → mark failed → customer reschedules → delivered → inspect timeline.

## 20. Implemented capabilities

**Email.** Resend sends transactional mail when `RESEND_API_KEY` is set. Development without a key logs the payload and stores `LOGGED`. Production without a key stores `FAILED` and does not pretend the email was sent.

**Agent location.** The agent dashboard uses `navigator.geolocation.watchPosition()`, throttled by `LOCATION_UPDATE_INTERVAL`, and writes `PATCH /api/agents/me/location`. Admin dashboards poll for near-real-time positions, mark stale locations, and use fresh coordinates for auto-assignment.

**Rate cards.** Exact zone-pair cards win. An admin-configured intra-zone or inter-zone fallback is used next. If neither exists, pricing is rejected.

**Authentication.** JWT is stored in an HTTP-only `access_token` cookie. The frontend keeps only safe user fields from `GET /api/auth/me` and never stores the token in `localStorage` or `sessionStorage`.

