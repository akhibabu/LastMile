<<<<<<< HEAD
# LastMile — Last-Mile Delivery Management Platform

A complete, demo-ready logistics platform with customer, delivery-agent, and admin roles. Orders are priced from configurable zone mappings and rate cards (not hardcoded), assigned to the nearest available agent, tracked with an immutable status history, and notified over email (or a DEV MODE logger).

## 1. Project Overview

LastMile lets a customer (or admin) enter pickup/drop addresses, package dimensions, weight, B2B/B2C, and Prepaid/COD. The platform resolves zones, computes volumetric and billable weight, selects the matching rate card, shows a full price breakdown, and only then creates the order. Admins assign agents manually or automatically. Agents walk the delivery state machine. Failed deliveries can be rescheduled without losing history.

## 2. Features

- JWT authentication and role-based access (CUSTOMER / AGENT / ADMIN)
- Configurable zones with pincode and area mappings stored in PostgreSQL
- Configurable rate cards for B2B/B2C × intra/inter-zone, including COD surcharge
- Price preview before confirmation (`POST /api/orders/preview-price`)
- Volumetric weight = (L × B × H) / 5000; billable = max(actual, volumetric)
- Manual assignment, auto-assignment (Haversine nearest agent, zone fallback)
- Immutable `OrderStatusHistory` (append-only)
- Failed delivery reasons, reschedule requests, delivery attempts
- Email notifications via provider interface (Resend or DEV MODE)
- Customer, agent, and admin dashboards with server-side metrics
- Swagger UI at `/api/docs`

## 3. Architecture

```
frontend (React + Vite)  -->  REST / JWT  -->  backend (Express)
                                                 |
                                                 +-- services (pricing, assignment, tracking, notifications, zones)
                                                 +-- Prisma / PostgreSQL
                                                 +-- Nominatim geocoding (optional)
                                                 +-- Email provider (Resend | DEV logger)
```

Business logic lives in services, not route files. Pricing, assignment, and tracking each have a dedicated service plus a pure function module under `backend/src/lib` that is unit-tested without a database.

## 4. Tech Stack

| Layer | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, React Router, TanStack Query |
| Backend | Node.js, Express 5, TypeScript, Zod, JWT, bcryptjs, Pino |
| Database | PostgreSQL 16 + Prisma ORM |
| Email | Resend (optional) or DEV MODE logger |
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
| `FRONTEND_URL` | CORS origin |
| `BACKEND_URL` | Public API URL |
| `EMAIL_PROVIDER` | `dev` \| `resend` |
| `EMAIL_API_KEY` | Required only for Resend |
| `FROM_EMAIL` | Sender address |
| `GEOCODING_USER_AGENT` | Nominatim user agent |
| `SEED_PASSWORD` | Password for seeded demo users |
| `VITE_API_URL` | Frontend API base, e.g. `http://localhost:4000/api` |

Missing email credentials do **not** crash the server. The DEV MODE adapter logs the message and stores `Notification.status = LOGGED`.

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
- B2B and B2C intra-zone and inter-zone rate cards for every Hyderabad zone pair (divisor 5000, COD surcharges). There is no generic fallback card.

It does **not** create a customer account. Sign up from the UI with your own name, email, and password.

An admin is created only when both `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set. If they are omitted, seeding skips admin creation rather than inventing a default password.

Agents are created by a logged-in admin from **Agents → Add agent**, not by the seed script.

## 10. Authentication

- `POST /api/auth/register` — always creates role `CUSTOMER` from the submitted name/email/phone/password (bcrypt hash). Extra fields such as `role` are rejected.
- `POST /api/auth/login` — looks up the email, compares bcrypt hashes, returns `{ token, user }`
- `POST /api/auth/logout` — client discards the token
- `GET /api/auth/me` — Bearer token; returns the stored profile (never `passwordHash`)
- Admins create agents via `POST /api/agents` with the agent's real name, email, and password
- Authorization is enforced on the API. The UI role is never trusted. Customers cannot set `customerId` on create — it is taken from the JWT.

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
5. Select an **active** rate card for that `orderType` + `rateScope` **and exact source/destination zone pair**. No global default.
6. `shippingCharge = baseRate + (billableWeight × perKgRate)`.
7. COD surcharge from the rate card if `paymentType == COD`, else 0.
8. `totalCharge = shippingCharge + codSurcharge`.

If no card matches, the API returns `422 MISSING_RATE_CARD` ("No rate card is configured for this route.") and **does not** create an order or invent a price.

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
2. If pickup and agent have coordinates → minimum Haversine distance (ties broken by agent id).
3. Else same `currentZoneId` as pickup zone.
4. Else any eligible agent (stable id sort).
5. Order → `ASSIGNED`, agent → `BUSY`, history + notification written.

Admin can also pick an agent manually or unassign before pickup.

## 15. Failed Delivery Flow

1. Agent on `OUT_FOR_DELIVERY` chooses **Mark failed** and a required reason.
2. Status `FAILED`, new `DeliveryAttempt`, history row, customer email.
3. Customer picks a new datetime → `RescheduleRequest` + attempt `RESCHEDULED` + status `RESCHEDULED`.
4. System auto-assigns the nearest available agent again (`ASSIGNED`).
5. Original failed attempt remains; a later `SUCCESS` attempt is a new row.

## 16. Notification System

`NotificationService.sendStatusNotification(orderId, status)` maps statuses to events (`ORDER_CREATED`, `ORDER_ASSIGNED`, …). Providers implement `EmailProvider.send`. DEV MODE logs `[DEV MODE EMAIL]` and persists `LOGGED`. Resend is used when `EMAIL_PROVIDER=resend` and `EMAIL_API_KEY` is set. SMS is abstracted as a channel enum for later providers.

## 17. Testing

```bash
npm test
```

Coverage (Vitest, no live DB required):

- Pricing: volumetric, billable, intra/inter, B2B/B2C, prepaid/COD, missing card, breakdown
- Assignment: nearest agent, exclusions, same-zone fallback, none available
- Tracking: valid/invalid transitions, admin override, append-only history API
- Failed delivery: reason required, FAILED→RESCHEDULED→ASSIGNED, attempt retention

## 18. Deployment

**Database (Neon/Supabase)**  
Create a Postgres instance, copy the connection string, run `npx prisma migrate deploy` and `npm run db:seed` once.

**Backend (Render)**  
Use `render.yaml` or: root `backend`, build `npm install && npx prisma generate && npm run build`, start `npx prisma migrate deploy && npm start`. Set `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL`, `NODE_ENV=production`.

**Frontend (Vercel)**  
Root `frontend`. Env: `VITE_API_URL=https://<api-host>/api`. Vite SPA rewrites are in `frontend/vercel.json`.

Do not hardcode localhost in production env vars.

## 19. Sample Credentials

There is **no** built-in customer login. Open **Sign up**, enter your own details, and use those credentials.

Admin (optional, only if you set seed env vars):

| Role | How to create |
| --- | --- |
| Customer | Public `/register` form |
| Admin | `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` then `npm run db:seed` |
| Agent | Admin dashboard → Agents → Add agent |

Demo path: register as a customer → create B2C COD Gachibowli `500084` → Hitech City `500081` → preview ₹2,095.00 (200 kg billable) → confirm → login as admin → auto-assign (after creating an available agent) → agent walks statuses → mark failed → customer reschedules → delivered → inspect timeline.

## 20. Known Limitations

- Email in local/dev is logged, not sent, unless Resend keys are provided.
- Agent location is last-known point-in-time, not a live GPS stream.
- Rate cards are zone-pair specific. A route without a matching card is rejected rather than priced from a generic default.
- JWT is stored in `localStorage` for a simple SPA demo (use httpOnly cookies for higher-sensitivity production).

## License

MIT — built as a project submission / evaluation deliverable.
=======
# LastMile
>>>>>>> 816841c2dae7b9793820b60a4e6a8f2fe78e2b4d
