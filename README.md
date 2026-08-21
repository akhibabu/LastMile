# Last-Mile Delivery Tracker

LastMile is a last-mile delivery management platform. Customers (or admins acting for a customer) create a shipment from pickup and drop locations; the API resolves Hyderabad zones from pincodes, prices the job from stored rate cards (B2B/B2C, intra/inter-zone, COD surcharge), and shows the quote before the order is confirmed. Admins assign agents manually or automatically. Agents update availability, share location, and walk a delivery status machine. Failed attempts can be rescheduled without rewriting history. Customers receive status emails, and admins manage zones, pincode mappings, rate cards, agents, and orders from the dashboard.

---

## Contents

1. [Project overview](#1-project-overview)
2. [Features](#2-features)
3. [Tech stack](#3-tech-stack)
4. [System architecture](#4-system-architecture)
5. [Folder structure](#5-folder-structure)
6. [Prerequisites](#6-prerequisites)
7. [Local setup](#7-local-setup)
8. [Environment variables](#8-environment-variables)
9. [Database setup](#9-database-setup)
10. [Database schema](#10-database-schema)
11. [Authentication and authorization](#11-authentication-and-authorization)
12. [API documentation](#12-api-documentation)
13. [API authentication](#13-api-authentication)
14. [Rate calculation logic](#14-rate-calculation-logic)
15. [Zone detection](#15-zone-detection)
16. [Auto-assignment](#16-auto-assignment)
17. [Order status lifecycle](#17-order-status-lifecycle)
18. [Notifications](#18-notifications)
19. [Failed delivery](#19-failed-delivery)
20. [Admin configuration](#20-admin-configuration)
21. [Testing](#21-testing)
22. [Deployment](#22-deployment)
23. [Demo accounts](#23-demo-accounts)
24. [Recommended demo flow](#24-recommended-demo-flow)
25. [Known limitations](#25-known-limitations)
26. [Design decisions](#26-design-decisions)
27. [Troubleshooting](#27-troubleshooting)

---

## 1. Project overview

The problem is operational, not cart-checkout: a dispatcher needs **configurable geography and prices**, a reliable **status timeline**, and a way to recover from a failed doorstep attempt. LastMile keeps those rules on the server. The UI never computes a charge or invents a zone.

**Who uses it**

| Role | What they do |
| --- | --- |
| **CUSTOMER** | Register, create a delivery, preview price, track timeline, reschedule a failed delivery, read notifications |
| **AGENT** | See assigned orders, toggle availability, share browser location, update delivery status |
| **ADMIN** | Configure zones / pincodes / rate cards, create agents, filter orders, assign (manual or auto), override status, retry failed emails |

**Main workflow**

Customer or Admin → create order → pickup/drop locality and 6-digit pincode → `ZoneResolutionService` (pincode lookup on `ZoneArea`) → `PricingService` / `selectRateCard` → `POST /api/orders/preview-price` → confirm `POST /api/orders` (`CREATED`) → Admin `assign` or `auto-assign` (`ASSIGNED`) → Agent status updates → `NotificationService` emails the customer → `DELIVERED`, or `FAILED` then customer/admin `reschedule`.

---

## 2. Features

### Authentication

- Public registration (always `CUSTOMER`; a `role` field in the body is rejected)
- Login / logout
- `GET /api/auth/me` restores the session from the HTTP-only cookie
- Role checks on the API (`authenticate` + `requireRoles`); the UI role is not trusted

### Customer

- Create delivery (B2B/B2C, Prepaid/COD, dimensions, actual weight)
- Price preview with zone, weights, rate card name, and `resolutionType`
- Order list and detail, including tracking timeline
- Reschedule when status is `FAILED`
- Notification inbox (`GET /api/notifications`)

### Agent

- Assigned-order dashboard
- Availability (`PATCH /api/agents/:id/availability` or `/me`)
- Location sharing (`PATCH /api/agents/me/location` from the session)
- Status updates along the agent-allowed state machine
- Location page and map of latest coordinates (Leaflet loaded from CDN, OpenStreetMap tiles)

### Admin

- Zones and pincode/area mappings (`Zone`, `ZoneArea`)
- Rate cards: exact zone-pair and explicit intra/inter fallback (`isFallback`)
- Agent create / list / available list / location overlay
- Orders with filters: `status`, `zoneId`, `agentId`, `orderType`, `paymentType`
- Manual assign, auto-assign, unassign (before pickup)
- Status override (`override: true`, admin only)
- Dashboard aggregates and notification retry

### Notifications

- Email on order status events via Resend when `RESEND_API_KEY` is set
- Rows stored on `Notification` (`PENDING` / `SENT` / `LOGGED` / `FAILED`)
- Admin retry of `FAILED` rows

What this repo does **not** ship: SMS or in-app push delivery (those channels exist only as Prisma enums), WebSocket location, or client-side pricing.

---

## 3. Tech stack

Derived from the workspace `package.json` files.

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 6, Tailwind CSS 4 (`@tailwindcss/vite`), React Router 7, TanStack Query, Axios, Zod, date-fns, lucide-react, react-hot-toast, clsx |
| Backend | Node.js (`engines`: `>=20`), Express 5, TypeScript, Zod, jsonwebtoken, bcryptjs, cookie-parser, cors, helmet, express-rate-limit, Pino, swagger-ui-express |
| Database | PostgreSQL 16 (`postgres:16-alpine` in Docker Compose) |
| ORM | Prisma 6 |
| Auth | JWT in HTTP-only cookie `access_token` |
| Email | Resend HTTP API (`ResendEmailProvider`). Development without a key uses `DevEmailProvider`. |
| Maps (UI) | Leaflet 1.9.4 from unpkg CDN + OpenStreetMap tiles (`AgentMap`) |
| Tests | Vitest (backend unit tests; no live database) |
| Local process | npm workspaces, `concurrently` for `npm run dev` |
| Deploy config in repo | `frontend/vercel.json`, `render.yaml`, `frontend/.env.production` |

A Nominatim client exists under `backend/src/services/geocoding/`. Zone detection does **not** call it; pincode mapping does the work. `EMAIL_PROVIDER` is accepted by env validation (`resend` / `sendgrid` / `mailgun` / `dev`) but provider construction currently keys off `RESEND_API_KEY`, not that enum.

---

## 4. System architecture

```mermaid
flowchart TD
  UI["React SPA (Vite)"]
  API["Express REST /api"]
  Svc["Service layer"]
  Lib["Pure lib: pricing, assignment, tracking, zone-match"]
  Prisma["Prisma"]
  PG["PostgreSQL"]
  Resend["Resend (optional)"]

  UI -->|"JSON + cookie credentials"| API
  API --> Svc
  Svc --> Lib
  Svc --> Prisma
  Prisma --> PG
  Svc -->|"EmailService"| Resend
```

| Piece | Responsibility |
| --- | --- |
| **PricingService** | Resolve pickup/drop zones, load active `RateCard` rows, `selectRateCard`, `buildPricingBreakdown`. Shared by preview and create. |
| **AssignmentService** | Eligible agents, Haversine nearest with fresh location, zone/any fallback, manual assign, unassign, busy/available refresh |
| **TrackingService** | Append-only `OrderStatusHistory`, `assertTransition`, `DeliveryAttempt` on `FAILED` / `DELIVERED` |
| **NotificationService** | Map order status → `NotificationEventType`, render template, dispatch email, persist status, admin retry |
| **AuthService** | bcrypt register/login, JWT sign, public user shape, admin-created agents |
| **ZoneResolutionService** | 6-digit pincode → `ZoneArea` on an active `Zone`; address/locality conflict check |
| **LocationService** | Catalog from `ZoneArea` for the locality dropdown (`GET /api/locations` is public) |
| **EmailService** | Thin wrapper over Resend / dev logger / unconfigured production stub |

Controllers stay thin. Money is never calculated in React.

---

## 5. Folder structure

```
.
├── docker-compose.yml          # local PostgreSQL 16
├── package.json                # npm workspaces + root scripts
├── render.yaml                 # Render web service (backend)
├── .env.example                # combined backend + frontend template
├── SYSTEM_DESIGN.md
├── docs/
│   ├── API.md
│   └── SCHEMA.md
├── frontend/
│   ├── vercel.json             # Vite SPA rewrites
│   ├── .env.example            # VITE_API_URL
│   ├── .env.production         # production API base URL baked into Vite builds
│   └── src/
│       ├── pages/              # customer, agent, admin screens
│       ├── components/         # timeline, price breakdown, map, location sharing
│       └── lib/                # axios client, auth context, errors
└── backend/
    ├── prisma/
    │   ├── schema.prisma
    │   ├── seed.ts
    │   └── migrations/
    ├── .env.example
    └── src/
        ├── index.ts            # listen on PORT
        ├── app.ts              # helmet, CORS, cookies, routes
        ├── config/             # env, prisma, logger
        ├── routes/             # Express routers + OpenAPI
        ├── controllers/
        ├── services/           # domain + email + geocoding (unused by zone resolve)
        ├── lib/                # pure, unit-tested
        ├── validators/         # Zod
        ├── middleware/         # auth, validate, rate limit
        └── __tests__/
```

---

## 6. Prerequisites

| Requirement | Source |
| --- | --- |
| Node.js **20 or newer** | `backend/package.json` → `engines.node` |
| **npm** | root `package-lock.json` (npm workspaces) |
| **Docker** (recommended) or any PostgreSQL 16-compatible server | `docker-compose.yml` image `postgres:16-alpine` |
| **Git** | clone |

---

## 7. Local setup

Commands below are the root workspace scripts from `package.json`. Run them from the repository root.

### 1. Clone and install

```bash
git clone https://github.com/akhibabu/LastMile.git
cd LastMile
npm install
```

### 2. Environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env`: set `JWT_SECRET` to at least 16 characters. Optionally set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` (min 8 characters) if you want the seed script to create an admin.

`frontend/.env.example` sets `VITE_API_URL=http://localhost:4000/api`. Vite also proxies `/api` and `/health` to `http://localhost:4000` (`frontend/vite.config.ts`). Either the absolute API URL or `/api` works locally because CORS allows `http://localhost:<port>`.

### 3. PostgreSQL

```bash
npm run db:up
```

This runs `docker compose up -d db`. Default URL matches the examples:

`postgresql://lastmile:lastmile@localhost:5432/lastmile`

### 4. Migrate and seed

```bash
npm run db:migrate
npm run db:seed
```

`db:migrate` is `prisma migrate deploy` in the backend workspace. For generating new migrations during development: `npm run db:migrate:dev -w backend`.

### 5. Start both apps

```bash
npm run dev
```

| Process | URL |
| --- | --- |
| API | http://localhost:4000 |
| Health | http://localhost:4000/health |
| Swagger UI | http://localhost:4000/api/docs |
| OpenAPI JSON | http://localhost:4000/api/docs.json |
| Web (Vite default) | http://localhost:5173 |

If 5173 is taken, Vite uses the next free port (often 5174). CORS already allows any `http://localhost:<port>`.

Useful splits:

```bash
npm run dev:backend
npm run dev:frontend
```

---

## 8. Environment variables

Templates: [`.env.example`](.env.example), [`backend/.env.example`](backend/.env.example), [`frontend/.env.example`](frontend/.env.example).

Backend loads `backend/.env` via `dotenv` in `backend/src/index.ts` and `prisma/seed.ts`. Values are validated in `backend/src/config/env.ts`.

| Variable | Purpose | Required |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `JWT_SECRET` | JWT signing key (minimum 16 characters) | Yes |
| `JWT_EXPIRES_IN` | Cookie/token lifetime, default `7d` (parsed as `Ns`/`Nm`/`Nh`/`Nd`) | No |
| `NODE_ENV` | `development` \| `test` \| `production` (default `development`) | No |
| `PORT` | API port (default `4000`) | No |
| `FRONTEND_URL` | Comma-separated CORS allowlist. Also allowed: local `http://localhost\|127.0.0.1:<port>` and `https://*.vercel.app` | No (default `http://localhost:5173`) |
| `BACKEND_URL` | Public API origin (default `http://localhost:4000`) | No |
| `RESEND_API_KEY` | Resend API key. When set, mail is sent. | No |
| `EMAIL_API_KEY` | Alias used if `RESEND_API_KEY` is empty (`resendApiKey()`) | No |
| `EMAIL_PROVIDER` | Validated enum; **not** what currently selects the provider | No (default `dev`) |
| `FROM_EMAIL` | Resend `from` address (default `noreply@lastmile.local`) | No |
| `FROM_NAME` | Display name and `GET /api/config` `appName` (default `LastMile`) | No |
| `LOCATION_UPDATE_INTERVAL` | Agent location throttle in ms (default `30000`) | No |
| `LOCATION_STALE_THRESHOLD` | Fresh-location window in ms (default `300000`) | No |
| `GEOCODING_USER_AGENT` | Nominatim user agent if that provider is used | No |
| `GEOCODING_API_KEY` | Optional; accepted by env schema | No |
| `SEED_ADMIN_NAME` | Display name for seeded admin (seed script only) | No |
| `SEED_ADMIN_EMAIL` | If set with password, seed creates an `ADMIN` user | No |
| `SEED_ADMIN_PASSWORD` | Min 8 characters; required together with email | No |
| `VITE_API_URL` | Frontend Axios `baseURL` (e.g. `http://localhost:4000/api`) | No (falls back to `/api`) |

Do not commit real `DATABASE_URL`, `JWT_SECRET`, or mail keys. Seed passwords belong only in local `backend/.env`, not in this README.

---

## 9. Database setup

Prisma schema: `backend/prisma/schema.prisma`. Migrations: `backend/prisma/migrations/`.

```bash
npm run db:up          # Docker Postgres
npm run db:migrate     # prisma migrate deploy
npm run db:seed        # tsx prisma/seed.ts
npm run db:reset       # prisma migrate reset --force (destructive)
```

Backend-only equivalents: `npm run db:migrate -w backend`, `npm run db:seed -w backend`, `npm run db:studio -w backend`.

Hosted Postgres (for example Neon): put the connection string in `DATABASE_URL`. Prisma migrate prefers a **direct** host if a pooled `-pooler` URL fails.

### What seed creates

`backend/prisma/seed.ts`:

- Five **active** Hyderabad zones: `HYD_WEST`, `HYD_CENTRAL`, `HYD_EAST`, `HYD_NORTH`, `HYD_SOUTH`, each with `ZoneArea` pincode/locality rows (Gachibowli `500084` and Hitech City `500081` are both `HYD_WEST`; Santoshnagar `500018` is `HYD_SOUTH`)
- One **inactive** zone `HYD_EXPANDING` (Miyapur, Kompally, Shamshabad) — catalog shows them as not yet bookable
- **50 exact** B2B/B2C zone-pair rate cards (5×5 pairs × 2 order types). Divisor `5000`, minimum chargeable weight `0.5`. No fallback cards are inserted
- Deactivates retired codes `ZONE_A`–`ZONE_D` if present
- Removes old demo logins `customer@example.com`, `agent1@example.com`, `agent2@example.com`, `agent3@example.com` (and `admin@example.com` only when `SEED_ADMIN_EMAIL` is unset)
- Creates an admin **only** when both `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` are set and that email does not already exist (existing admin password is not rotated)

It does **not** create customers or agents. Customers use **Sign up**. Agents are created in Admin → Agents.

Re-running seed **deletes all rate cards** and recreates the 50 exact routes. Custom fallback cards would be wiped.

Seeded intra/inter amounts (INR):

| Order type | Scope | baseRate | perKgRate | COD surcharge |
| --- | --- | --- | --- | --- |
| B2C | INTRA_ZONE | 55 | 10 | 40 |
| B2C | INTER_ZONE | 85 | 12 | 50 |
| B2B | INTRA_ZONE | 45 | 8 | 25 |
| B2B | INTER_ZONE | 70 | 10 | 35 |

---

## 10. Database schema

Source of truth: `backend/prisma/schema.prisma`.

```mermaid
erDiagram
  User ||--o| CustomerProfile : has
  User ||--o| AgentProfile : has
  User ||--o{ Order : "customer orders"
  User ||--o{ Notification : receives
  User ||--o{ OrderStatusHistory : actor
  User ||--o{ RescheduleRequest : requests
  AgentProfile ||--o{ Order : "assigned agent"
  AgentProfile ||--o{ AgentLocation : history
  AgentProfile ||--o{ DeliveryAttempt : attempts
  AgentProfile }o--o| Zone : currentZone
  Zone ||--o{ ZoneArea : areas
  Zone ||--o{ Order : pickup
  Zone ||--o{ Order : drop
  Zone ||--o{ RateCard : source
  Zone ||--o{ RateCard : destination
  Order ||--o{ OrderStatusHistory : timeline
  Order ||--o{ DeliveryAttempt : attempts
  Order ||--o{ Notification : notices
  Order ||--o{ RescheduleRequest : reschedules
```

### User

Identity, bcrypt `passwordHash`, `Role` (`CUSTOMER` | `AGENT` | `ADMIN`). Public API responses omit `passwordHash`.

### CustomerProfile

Optional address / city / pincode collected at register. One-to-one with `User`.

### AgentProfile

`status` (`AVAILABLE` | `BUSY` | `OFFLINE`), `isAvailable`, current lat/lng, `currentZoneId`, `locationUpdatedAt`, `maxActiveOrders` (default 5). Assigned orders hang off this profile, not `User.id`.

### Zone and ZoneArea

Admin-managed geography. `Zone.code` is unique (`HYD_WEST`, …). `ZoneArea` maps a 6-digit `pincode` and optional `areaName` / city / coordinates. Pincode is indexed; it is the authoritative lookup key.

### RateCard

`orderType` B2B/B2C, `rateScope` INTRA/INTER, optional `sourceZoneId` / `destinationZoneId`, `baseRate`, `perKgRate`, `minimumChargeableWeight`, `volumetricDivisor` (default 5000), `codSurcharge`, `isFallback`, `active`. Exact cards require both zones. Fallback cards must not target a zone pair. At most one **active** fallback per (orderType, rateScope).

### Order

Shipment: addresses, pincodes, coordinates, zones, dimensions, `actualWeight` / `volumetricWeight` / `billableWeight`, charges snapshotted from the quote (`baseCharge`, `perKgRate`, `shippingCharge`, `codSurcharge`, `totalCharge`), `rateCardId`, `orderType`, `paymentType`, `status`, optional `scheduledDeliveryDate`. `orderNumber` like `LM-YYYYMMDD-XXXX`.

### OrderStatusHistory

Append-only. `status`, optional `actorId`, `timestamp`, `note`, `metadata` JSON. There is no update/delete API.

### DeliveryAttempt

Per-attempt `FAILED` | `RESCHEDULED` | `SUCCESS`, optional `FailureReason`, `attemptNumber`. Failed and successful attempts are separate rows.

### RescheduleRequest

Customer/admin request: previous/new datetime, note.

### AgentLocation

Point-in-time lat/lng samples when location is patched.

### Notification

`channel` (schema allows `EMAIL` | `SMS` | `IN_APP`; the service always writes `EMAIL`), `eventType`, `recipient`, `subject`, `body`, `status`, optional `providerMessageId` / `errorMessage` / `sentAt`.

---

## 11. Authentication and authorization

| Step | Behavior |
| --- | --- |
| Register | `POST /api/auth/register` — bcrypt cost 12, role always `CUSTOMER`, creates `CustomerProfile`. Sets cookie, returns `{ user }` (201). |
| Login | `POST /api/auth/login` — email lookup, `bcrypt.compare`. Sets cookie, returns `{ user }` (200). |
| Logout | `POST /api/auth/logout` — clears cookie. Returns `{ loggedOut: true }`. |
| Me | `GET /api/auth/me` — cookie required. Returns public user + profiles. |

JWT payload: `{ sub, email, role }`, signed with `JWT_SECRET`, expiry `JWT_EXPIRES_IN`.

Cookie `access_token`: `httpOnly`, `path=/`, `maxAge` from expiry. `secure` + `SameSite=None` when `NODE_ENV=production`; otherwise `SameSite=Lax` and not `secure`.

Middleware reads **only** `req.cookies.access_token`. Bearer tokens in JSON or `Authorization` are not used. The SPA uses Axios `withCredentials: true` and never stores the JWT in `localStorage` / `sessionStorage` (`frontend/src/lib/auth.tsx` also removes a legacy `lastmile_token` key if present).

Auth routes are limited to 30 requests / 15 minutes (`authLimiter`). Other `/api` routes: 400 / 15 minutes (`apiLimiter`).

### Role access (API)

| Capability | CUSTOMER | AGENT | ADMIN |
| --- | --- | --- | --- |
| Register / login | public | public | public |
| Preview price, list/get own-scoped orders, tracking | yes (own) | yes (assigned) | yes (all) |
| Create order | yes (`customerId` forced to self) | no | yes (must send `customerId`) |
| Assign / auto-assign / unassign | no | no | yes |
| Status update | no | agent-allowed transitions | full machine; `override` skips it |
| Reschedule | own `FAILED` order | no | any `FAILED` order |
| Zones GET / lookup | yes | yes | yes |
| Zone write / areas | no | no | yes |
| Rate cards GET | yes | no | yes |
| Rate cards write | no | no | yes |
| Agents list / create | no | no | yes |
| `GET /agents/me`, own location & availability | no | yes | yes (`/me` for admin only if they have an agent profile) |
| `PATCH /agents/me/location` | no | yes | no |
| Notifications list | own | own | all |
| Notification retry | no | no | yes |
| Admin dashboard / customers | dashboard is role-scoped | dashboard is role-scoped | full |

`GET /api/locations` and `GET /api/locations/search` are **unauthenticated**. `GET /api/config`, `/health`, `/`, and `/api/docs` are public.

---

## 12. API documentation

Interactive spec: `http://localhost:4000/api/docs` (JSON: `/api/docs.json`). Compact copy: [`docs/API.md`](docs/API.md).

Base path: `/api`. Envelope:

```json
{ "success": true, "data": {}, "message": "OK" }
```

Error:

```json
{
  "success": false,
  "message": "Pricing isn't available for this route yet.",
  "code": "MISSING_RATE_CARD",
  "errors": []
}
```

Zod failures: `422` `VALIDATION_ERROR` with `errors: [{ path, message }]`.

### Public / meta

#### GET `/`

Unauthenticated. Returns links to `/health`, `/api/docs`, `/api/config`.

#### GET `/health`

Unauthenticated. `{ "status": "ok" }` inside `data`.

#### GET `/api/config`

Unauthenticated.

```json
{
  "appName": "LastMile",
  "locationUpdateIntervalMs": 30000,
  "locationStaleThresholdMs": 300000
}
```

#### GET `/api/docs` · GET `/api/docs.json`

Swagger UI and the OpenAPI document.

---

### AUTH

#### POST `/api/auth/register`

Authentication: none. Role created: `CUSTOMER`.

Purpose: sign up.

Request:

```json
{
  "name": "Rahul Sharma",
  "email": "rahul@example.com",
  "phone": "9876543210",
  "password": "at-least-8-chars",
  "address": "optional",
  "city": "Hyderabad",
  "pincode": "500084"
}
```

`pincode` if present must be 6 digits. Extra keys (including `role`) fail validation.

Response `201`: `{ "user": { "id", "name", "email", "phone", "role", "createdAt", "customerProfile" } }` plus `Set-Cookie: access_token`.

Errors: `409 CONFLICT` email taken; `422 VALIDATION_ERROR`; `429 RATE_LIMITED`.

#### POST `/api/auth/login`

Authentication: none.

Request:

```json
{ "email": "rahul@example.com", "password": "at-least-8-chars" }
```

Response `200`: `{ "user": { …, "customerProfile", "agentProfile" } }` plus cookie.

Errors: `401 UNAUTHORIZED` invalid credentials; `429 RATE_LIMITED`.

#### POST `/api/auth/logout`

Authentication: not required.

Response `200`: `{ "loggedOut": true }`. Cookie cleared.

#### GET `/api/auth/me`

Authentication: cookie.

Response `200`: public user including `customerProfile` and `agentProfile` (`currentZone` included for agents).

Errors: `401 UNAUTHORIZED`.

---

### ORDERS

Shared quote/create body (pincodes required, 6 digits; dimensions and `actualWeight` must be `> 0`):

```json
{
  "pickupAddress": "Gachibowli, Hyderabad",
  "pickupPincode": "500084",
  "pickupLatitude": 17.4401,
  "pickupLongitude": 78.3489,
  "dropAddress": "Hitech City, Hyderabad",
  "dropPincode": "500081",
  "dropLatitude": 17.4483,
  "dropLongitude": 78.3811,
  "length": 100,
  "breadth": 100,
  "height": 100,
  "actualWeight": 10,
  "orderType": "B2C",
  "paymentType": "COD"
}
```

Lat/lng are optional; if omitted, zone-area or zone centroid coordinates are stored on the order.

#### POST `/api/orders/preview-price`

Authentication: any logged-in role.

Purpose: quote without inserting an order.

Response `200` `data` includes breakdown fields plus resolved `pickup` / `drop`:

```json
{
  "pickupZone": { "id": "…", "code": "HYD_WEST", "name": "Hyderabad West" },
  "dropZone": { "id": "…", "code": "HYD_WEST", "name": "Hyderabad West" },
  "zoneScope": "INTRA_ZONE",
  "orderType": "B2C",
  "paymentType": "COD",
  "actualWeight": 10,
  "volumetricWeight": 200,
  "billableWeight": 200,
  "volumetricDivisor": 5000,
  "rateCardId": "…",
  "rateCardName": "B2C HYD_WEST → HYD_WEST",
  "baseRate": 55,
  "perKgRate": 10,
  "shippingCharge": 2055,
  "weightCharge": 2000,
  "codSurcharge": 40,
  "totalCharge": 2095,
  "resolutionType": "EXACT_ZONE_PAIR",
  "pickup": {
    "id": "…",
    "code": "HYD_WEST",
    "name": "Hyderabad West",
    "method": "PINCODE",
    "pincode": "500084",
    "areaName": "Gachibowli",
    "city": "Hyderabad",
    "latitude": 17.4401,
    "longitude": 78.3489
  },
  "drop": { },
  "pickupAddress": "Gachibowli, Hyderabad",
  "dropAddress": "Hitech City, Hyderabad",
  "length": 100,
  "breadth": 100,
  "height": 100
}
```

`resolutionType`: `EXACT_ZONE_PAIR` | `INTRA_ZONE_FALLBACK` | `INTER_ZONE_FALLBACK`.

Errors: `422 ZONE_UNRESOLVED`, `422 ADDRESS_PINCODE_MISMATCH`, `422 MISSING_RATE_CARD`, `422 VALIDATION_ERROR`.

#### POST `/api/orders`

Authentication: cookie. Role: `CUSTOMER`, `ADMIN`.

Purpose: persist the same quote. Create **recalculates** on the server; clients cannot submit a total.

Request: quote body plus optional `notes` (max 400). Admin **must** send `customerId`. Customer `customerId` is ignored (taken from JWT).

Response `201`: order with `status: "CREATED"`, `orderNumber`, snapshotted charges, `customer`, zones, empty `statusHistory` after reload including the CREATED row, `attempts`, `reschedules`.

Errors: same as preview; `403` if admin omits `customerId` or an agent tries to create.

#### GET `/api/orders`

Authentication: cookie.

Query (all optional): `status`, `zoneId` (pickup **or** drop), `agentId` (admin), `orderType`, `paymentType`, `customerId` (admin).

Scope: customer → own; agent → assigned to their `AgentProfile`; admin → all, then filters.

#### GET `/api/orders/:id`

Authentication: cookie. Owner, assigned agent, or admin.

Errors: `404 NOT_FOUND`, `403 FORBIDDEN`.

#### GET `/api/orders/:id/tracking`

Authentication: same as get.

Response `data`:

```json
{
  "orderId": "…",
  "orderNumber": "LM-20260821-ABCD",
  "status": "ASSIGNED",
  "scheduledDeliveryDate": null,
  "assignedAgent": { },
  "pickupAddress": "…",
  "dropAddress": "…",
  "timeline": [],
  "attempts": []
}
```

`timeline` is `statusHistory` (append-only).

#### POST `/api/orders/:id/assign`

Authentication: cookie. Role: `ADMIN`.

Request: `{ "agentId": "<AgentProfile.id>" }`

Response `200`: `{ "order": {…}, "assignment": { "agent", "distanceKm", "reason", "locationFresh" } }`

`reason` for manual assign is stored as `ANY_AVAILABLE_FALLBACK`.

Errors: `422 INVALID_STATUS` (not `CREATED` / `RESCHEDULED` / `ASSIGNED`), `422 AGENT_UNAVAILABLE`, `422 AGENT_OVERLOADED`, `404`.

#### POST `/api/orders/:id/auto-assign`

Authentication: cookie. Role: `ADMIN`. No body.

Response: `{ "order", "assignment" }` with `reason` `NEAREST_GEOGRAPHIC` | `SAME_ZONE_FALLBACK` | `ANY_AVAILABLE_FALLBACK`.

Errors: `422 NO_AVAILABLE_AGENT`, `422 INVALID_STATUS`.

#### POST `/api/orders/:id/unassign`

Authentication: cookie. Role: `ADMIN`. Allowed when status is `ASSIGNED` or `CREATED`. Sets status `CREATED`, clears agent.

Errors: `422 INVALID_STATUS`.

#### POST `/api/orders/:id/status`

Authentication: cookie. Role: `ADMIN`, `AGENT`.

Request:

```json
{
  "status": "FAILED",
  "note": "optional",
  "reason": "CUSTOMER_UNAVAILABLE",
  "override": false
}
```

`reason` required when `status` is `FAILED`: `CUSTOMER_UNAVAILABLE` | `WRONG_ADDRESS` | `ACCESS_ISSUE` | `CUSTOMER_REFUSED` | `OTHER`.

`override` is honored only if the actor is `ADMIN`.

Errors: `422 INVALID_TRANSITION`, `422 FAILURE_REASON_REQUIRED`.

#### POST `/api/orders/:id/reschedule`

Authentication: cookie. Role: `CUSTOMER`, `ADMIN`.

Request:

```json
{
  "scheduledDeliveryDate": "2026-08-22T10:30:00.000Z",
  "note": "optional"
}
```

Only when current status is `FAILED`. Creates `RescheduleRequest` + `DeliveryAttempt` `RESCHEDULED`, sets order `RESCHEDULED`, clears agent, then **attempts** auto-assign (failure to find an agent is logged; reschedule still succeeds).

Response: `{ "order", "assignment": null | {…} }`

Errors: `422 INVALID_STATUS`, `403` if customer does not own the order.

---

### AGENTS

All routes below require a cookie.

#### GET `/api/agents`

Role: `ADMIN`. List with user, zone, in-flight assigned orders, plus `locationFresh`, `locationAgeMs`, `locationStatus` (`FRESH` | `STALE` | `UNAVAILABLE`).

#### GET `/api/agents/available`

Role: `ADMIN`. `isAvailable: true` and `status: AVAILABLE`.

#### GET `/api/agents/me`

Role: `AGENT`, `ADMIN`. Current user's `AgentProfile`.

#### POST `/api/agents`

Role: `ADMIN`. Creates `User` role `AGENT` + profile.

Request:

```json
{
  "name": "Priya Agent",
  "email": "priya@example.com",
  "phone": "9876543210",
  "password": "at-least-8-chars",
  "currentZoneId": "optional-zone-id",
  "currentLatitude": 17.44,
  "currentLongitude": 78.36,
  "isAvailable": true
}
```

Default availability is `true` → status `AVAILABLE`. Errors: `409 CONFLICT`.

#### PATCH `/api/agents/me/location`

Role: `AGENT`. Body: `{ "latitude": 17.44, "longitude": 78.36 }` (WGS84 bounds). Agent id comes from the session.

Appends `AgentLocation` and updates `currentLatitude` / `currentLongitude` / `locationUpdatedAt`.

#### PATCH `/api/agents/:id/location`

Role: `AGENT`, `ADMIN`. Same body plus optional `zoneId`. Agents may only patch their own profile.

#### PATCH `/api/agents/:id/availability`

Role: `AGENT`, `ADMIN`. `{ "isAvailable": true, "status": "AVAILABLE" }`. `status` optional: `AVAILABLE` | `BUSY` | `OFFLINE`. `:id` may be `me`.

---

### LOCATIONS

#### GET `/api/locations`

Unauthenticated. Optional query `q` / `search` / `query`.

Each item:

```json
{
  "id": "…",
  "locality": "Gachibowli",
  "area": "Gachibowli",
  "city": "Hyderabad",
  "state": "Telangana",
  "pincode": "500084",
  "zoneId": "…",
  "zoneName": "Hyderabad West",
  "zoneCode": "HYD_WEST",
  "isActive": true
}
```

`state` is derived (`Hyderabad` → `Telangana`); it is not a database column. Inactive parent zones are still returned so the UI can show coming-soon localities.

#### GET `/api/locations/search`

Same handler as list, with the same query params.

---

### ZONES

Cookie required for all `/api/zones` routes.

#### GET `/api/zones`

Any authenticated role. Zones with `areas` and order counts.

#### GET `/api/zones/locations`

Cookie required. Same catalog as public `GET /api/locations` (`listLocations`).

#### GET `/api/zones/lookup?pincode=500084`

Resolves an active mapping.

```json
{
  "pincode": "500084",
  "areaName": "Gachibowli / Kondapur",
  "city": "Hyderabad",
  "zone": { "id": "…", "code": "HYD_WEST", "name": "Hyderabad West" },
  "source": "PINCODE"
}
```

Errors: `404 ZONE_UNRESOLVED`.

#### GET `/api/zones/:id`

Single zone + areas.

#### POST `/api/zones`

Role: `ADMIN`.

```json
{
  "name": "Hyderabad West",
  "code": "HYD_WEST",
  "description": "optional",
  "active": true,
  "centroidLat": 17.44,
  "centroidLng": 78.36
}
```

`code` must match `^[A-Z0-9_]+$`. Error: `409` duplicate code.

#### PUT `/api/zones/:id`

Role: `ADMIN`. Partial of the create body.

#### DELETE `/api/zones/:id`

Role: `ADMIN`. **Deactivates** (`active: false`); it does not hard-delete.

#### POST `/api/zones/:id/areas`

Role: `ADMIN`. `{ "pincode": "500084", "areaName": "Gachibowli", "city": "Hyderabad", "latitude": 17.44, "longitude": 78.35 }`. `pincode` is required (6 digits).

#### DELETE `/api/zones/:id/areas/:areaId`

Role: `ADMIN`. Hard-deletes that `ZoneArea` row.

---

### RATE CARDS

Cookie required.

#### GET `/api/rate-cards`

Role: `ADMIN`, `CUSTOMER`. Includes `sourceZone` / `destinationZone`.

#### POST `/api/rate-cards`

Role: `ADMIN`.

Exact route:

```json
{
  "name": "B2C HYD_WEST → HYD_WEST",
  "orderType": "B2C",
  "rateScope": "INTRA_ZONE",
  "isFallback": false,
  "sourceZoneId": "…",
  "destinationZoneId": "…",
  "baseRate": 55,
  "perKgRate": 10,
  "minimumChargeableWeight": 0.5,
  "volumetricDivisor": 5000,
  "codSurcharge": 40,
  "active": true
}
```

Fallback: `isFallback: true` and **no** zone ids. One active fallback per `(orderType, rateScope)`.

Errors: `422` custom refine messages; `422 DUPLICATE_FALLBACK_CARD`.

#### PUT `/api/rate-cards/:id`

Role: `ADMIN`. Partial update.

#### DELETE `/api/rate-cards/:id`

Role: `ADMIN`. Hard-deletes the row.

---

### TRACKING

Covered by `GET /api/orders/:id/tracking` and `POST /api/orders/:id/status`. History is created only via `TrackingService.appendHistory`.

---

### NOTIFICATIONS

#### GET `/api/notifications`

Cookie. Customer/agent: own rows (limit 100). Admin: all (limit 200) with user and order number.

#### POST `/api/notifications/:id/retry`

Role: `ADMIN`. Only `status === FAILED`. Reuses the same row (`NOTIFICATION_NOT_RETRYABLE` otherwise).

#### GET `/api/admin/notifications`

Same list handler as `GET /api/notifications` (admin sees all).

---

### ADMIN

#### GET `/api/admin/dashboard`

Cookie. Any authenticated role; payload depends on role.

Admin: `totalOrders`, `activeOrders`, `deliveredOrders`, `failedOrders`, `cancelledOrders`, `availableAgents`, `busyAgents`, `revenue`, `codOrders`.

Customer: counts + `recent` (8 orders).

Agent: `assignedOrders`, `activeDeliveries`, `completedDeliveries`, `failedDeliveries`, `agent`, `current`.

#### GET `/api/admin/customers`

Role: `ADMIN`. `{ id, name, email, phone, createdAt }` for `role: CUSTOMER`.

---

### Error codes (implemented)

| Code | Typical HTTP | When |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | Missing/invalid cookie |
| `FORBIDDEN` | 403 | Wrong role or not owner |
| `NOT_FOUND` | 404 | Missing resource or unknown route |
| `CONFLICT` | 409 | Duplicate email or zone code |
| `VALIDATION_ERROR` | 422 | Zod |
| `ZONE_UNRESOLVED` | 422 / 404 | Unmapped or ambiguous pincode |
| `ADDRESS_PINCODE_MISMATCH` | 422 | Locality text belongs to another zone |
| `MISSING_RATE_CARD` | 422 | No exact card and no fallback |
| `DUPLICATE_FALLBACK_CARD` | 422 | Second active fallback for type+scope |
| `INVALID_STATUS` | 422 | Assign/reschedule/unassign in the wrong state |
| `INVALID_TRANSITION` | 422 | Illegal status jump |
| `FAILURE_REASON_REQUIRED` | 422 | `FAILED` without `reason` |
| `NO_AVAILABLE_AGENT` | 422 | Auto-assign found nobody eligible |
| `AGENT_UNAVAILABLE` | 422 | Manual pick not AVAILABLE |
| `AGENT_OVERLOADED` | 422 | At `maxActiveOrders` |
| `NOTIFICATION_NOT_RETRYABLE` | 422 | Retry on non-FAILED row |
| `RATE_LIMITED` | 429 | Auth or API limiter |
| `INTERNAL_ERROR` | 500 | Unhandled |

---

## 13. API authentication

1. Login or register signs a JWT and calls `res.cookie("access_token", token, …)`.
2. The JSON body contains `{ user }` only — no token field.
3. The browser stores the cookie on the **API host** (e.g. `localhost:4000` or `lastmile-api-4xox.onrender.com`).
4. Subsequent Axios calls use `withCredentials: true`, so the cookie is sent automatically.
5. `authenticate` verifies the JWT and sets `req.user = { id, email, role }`.
6. Logout clears the same cookie flags (`httpOnly`, `secure`, `sameSite`, `path`).

Cross-site production (Vercel → Render) needs `SameSite=None; Secure` (production cookie options) and CORS `credentials: true` with a reflected allowed origin — not `*`.

---

## 14. Rate calculation logic

Implemented in `backend/src/lib/pricing.ts`, invoked by `PricingService.quote`. Preview and create share this path. The UI cannot submit a homemade total.

1. Resolve **pickup zone** from the 6-digit pickup pincode (`ZoneResolutionService`).
2. Resolve **drop zone** the same way.
3. Load **active** rate cards from PostgreSQL.
4. `zoneScope` = `INTRA_ZONE` if pickup zone id equals drop zone id, else `INTER_ZONE`.
5. **Volumetric weight** (kg), rounded to 3 decimals:

   \[
   \text{volumetricWeight} = \frac{L \times B \times H}{\text{volumetricDivisor}}
   \]

   Dimensions are centimetres as entered. Default divisor is **5000** (`DEFAULT_VOLUMETRIC_DIVISOR`), stored per card so it is configurable without a code change.
6. **Billable weight**:

   \[
   \text{billableWeight} = \max(\text{actualWeight},\; \text{volumetricWeight},\; \text{minimumChargeableWeight})
   \]

   Seeded `minimumChargeableWeight` is `0.5`. There is **no** volumetric cap in code.
7. Select a card for `(orderType, zoneScope)`:
   1. Exact active pair: `sourceZoneId` / `destinationZoneId` match, `isFallback !== true` → `EXACT_ZONE_PAIR`
   2. Else active fallback: `isFallback === true` and both zone ids null → `INTRA_ZONE_FALLBACK` or `INTER_ZONE_FALLBACK`
   3. Else throw `MISSING_RATE_CARD` — **no hidden default rate**
8. **Shipping**: `shippingCharge = baseRate + (billableWeight × perKgRate)` (2 decimal places).
9. **COD**: `codSurcharge` from the card if `paymentType === COD`, else `0`. Prepaid does not add it.
10. **Total**: `shippingCharge + codSurcharge`.
11. Preview returns the breakdown; create snapshots the same numbers onto `Order`.

`weightCharge` in the quote is `billableWeight × perKgRate` (informational; shipping already includes base + weight).

### Worked example (seeded cards)

Pickup Gachibowli **500084** → drop Hitech City **500081**, both `HYD_WEST`. Package **100 × 100 × 100 cm**, **10 kg**, **B2C**, **COD**.

| Step | Result |
| --- | --- |
| Zones | INTRA_ZONE, exact card `B2C HYD_WEST → HYD_WEST` |
| Volumetric | \(100 \times 100 \times 100 / 5000 = 200\) kg |
| Billable | \(\max(10, 200, 0.5) = 200\) kg |
| Shipping | \(55 + 200 \times 10 = 2055\) |
| COD | 40 |
| **Total** | **₹2095.00** |
| `resolutionType` | `EXACT_ZONE_PAIR` |

Same package **PREPAID**: total **₹2055.00** (COD omitted). Same package **B2B COD** intra-zone: \(45 + 200 \times 8 + 25 = 1670\).

---

## 15. Zone detection

`ZoneResolutionService.resolve`:

1. Normalize a 6-digit pincode from `pickupPincode` / `dropPincode`, or extract one from the address string.
2. Load `ZoneArea` rows for that pincode on an **active** zone.
3. Zero rows → `ZONE_UNRESOLVED`. Multiple **different** zones for one pincode → `ZONE_UNRESOLVED`.
4. Prefer an area whose `areaName` appears in the address; otherwise the first mapping.
5. If the address names another mapped locality that belongs to a **different** zone → `ADDRESS_PINCODE_MISMATCH`.
6. Coordinates on the result: request lat/lng, else area lat/lng, else zone centroid. Method is always `"PINCODE"`.

Geocoding/Nominatim is **not** on this path. Admins configure mappings in **Admin → Zones** (`POST /api/zones`, `POST /api/zones/:id/areas`). The create-order UI loads localities from `GET /api/locations`.

---

## 16. Auto-assignment

`AssignmentService.assignNearestAgent` → `selectNearestAgent` (`backend/src/lib/assignment.ts`).

**Eligible** agents: `isAvailable === true`, `status === AVAILABLE`, `activeOrderCount < maxActiveOrders`. Active orders are those in `ASSIGNED`, `PICKED_UP`, `IN_TRANSIT`, `OUT_FOR_DELIVERY`, `RESCHEDULED`.

**Priority**

1. If pickup has coordinates **and** at least one eligible agent has coordinates with `locationUpdatedAt` within `LOCATION_STALE_THRESHOLD` (default 5 minutes): pick minimum **Haversine** distance (Earth radius 6371 km). Ties: agent id.
2. Else eligible agents whose `currentZoneId` equals pickup zone → first by id (`SAME_ZONE_FALLBACK`). Stale coordinates are not used for ranking.
3. Else any eligible agent by id (`ANY_AVAILABLE_FALLBACK`).

The write path sets order `ASSIGNED`, agent `BUSY` / `isAvailable: false`, and history metadata `{ agentId, reason, distanceKm, locationFresh, auto }`.

Haversine is the great-circle distance between two WGS84 points; it is only a ranking metric, not a road ETA.

---

## 17. Order status lifecycle

Enums from `schema.prisma` / `backend/src/lib/tracking.ts`.

Happy path:

```
CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
```

Failure / recovery:

```
OUT_FOR_DELIVERY → FAILED → RESCHEDULED → ASSIGNED → …
```

Also allowed: `CREATED`/`ASSIGNED`/`PICKED_UP`/`FAILED`/`RESCHEDULED` → `CANCELLED`. `IN_TRANSIT` cannot cancel via the machine (admin `override` can). `DELIVERED` and `CANCELLED` are terminal.

Agents may only:

```
ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED | FAILED
```

Admin `override: true` skips `ALLOWED_TRANSITIONS` (still cannot no-op the same status).

Each change inserts a new `OrderStatusHistory` row. `TrackingService` has `appendHistory` / `getTimeline` only — no update or delete.

---

## 18. Notifications

`NotificationService.sendStatusNotification` maps:

| Order status | Event |
| --- | --- |
| CREATED | `ORDER_CREATED` |
| ASSIGNED | `ORDER_ASSIGNED` |
| PICKED_UP | `ORDER_PICKED_UP` |
| IN_TRANSIT | `ORDER_IN_TRANSIT` |
| OUT_FOR_DELIVERY | `ORDER_OUT_FOR_DELIVERY` |
| DELIVERED | `ORDER_DELIVERED` |
| FAILED | `ORDER_FAILED` |
| RESCHEDULED | `ORDER_RESCHEDULED` |
| CANCELLED | `ORDER_CANCELLED` |

Templates: `backend/src/services/email/templates.ts`. Channel stored: `EMAIL`. Recipient: customer email.

| Environment | Key | Row status |
| --- | --- | --- |
| Any | `RESEND_API_KEY` (or `EMAIL_API_KEY`) set and Resend accepts | `SENT` (`sentAt` set) |
| Non-production | no key | `LOGGED` (payload written to Pino) |
| Production | no key | `FAILED` (order still succeeds) |
| Resend HTTP error | key set | `FAILED` |

Admin retry: `POST /api/notifications/:id/retry`.

### Resend setup

1. Create an account at [resend.com](https://resend.com).
2. Generate an API key in the Resend dashboard.
3. Put it only in **`backend/.env`** as `RESEND_API_KEY=` (never in the frontend, README, or git).
4. Set `FROM_EMAIL` to a sender Resend accepts (a domain you verified in Resend, or Resend’s documented test sender). Set `FROM_NAME` if you want a display name.
5. Restart the backend. Startup should log `Resend email provider configured.`
6. Trigger a real notification (create an order or change status), or as admin call `POST /api/admin/notifications/test-email` with `{ "email": "you@example.com" }`.

Without `RESEND_API_KEY`, local development logs the message and stores `LOGGED`. `SENT` is recorded only after Resend accepts the send.

---

## 19. Failed delivery

1. Agent (from `OUT_FOR_DELIVERY`) or admin posts `status: FAILED` with `reason`.
2. Order becomes `FAILED`. A `DeliveryAttempt` (`FAILED`) is inserted. History row added. Customer emailed (`ORDER_FAILED`). Agent availability is refreshed if they have no other active orders.
3. Customer or admin posts `reschedule` with `scheduledDeliveryDate`.
4. `RescheduleRequest` stored; another attempt row `RESCHEDULED`; order `RESCHEDULED`; previous agent cleared.
5. Auto-assign is attempted. If an agent exists, status becomes `ASSIGNED` and a second email (`ORDER_ASSIGNED`) is sent.
6. Later `DELIVERED` creates a **new** `SUCCESS` attempt. The original `FAILED` row is not updated.

---

## 20. Admin configuration

| Area | How |
| --- | --- |
| Zones | Name, code, active flag, centroid, description |
| Locations / pincodes | `ZoneArea` rows (pincode required) |
| Rate cards | Exact pairs and fallbacks; `baseRate`, `perKgRate`, divisor, min weight, **COD surcharge** |
| Agents | Create with email/password; availability; map of latest positions |
| Orders | Filters, assign, auto-assign, unassign, status override |

Pricing is **configuration-driven**. Changing a card or mapping changes the next quote. Historical orders keep the charges snapshotted at create time.

---

## 21. Testing

Framework: **Vitest**. Command (root or backend):

```bash
npm test
```

(`npm run test -w backend` / `npm run test:watch -w backend`)

Tests live in `backend/src/__tests__/`. They exercise **pure functions and validators**; they do not boot Express or PostgreSQL.

| File | What it covers |
| --- | --- |
| `pricing.test.ts` | Volumetric \(L \times B \times H / 5000\), billable max, intra/inter, B2B/B2C, COD vs prepaid, exact vs fallback, missing card, 100×100×100 → 200 kg / ₹2095 path |
| `zone-match.test.ts` | Pincode normalize, address/locality vs zone conflict |
| `location-search.test.ts` | Catalog query matching |
| `assignment.test.ts` | Haversine nearest, stale coords ignored, ineligible agents, same-zone and any-available fallback |
| `tracking.test.ts` | Allowed/illegal transitions, admin override, agent restrictions, no history update/delete on the service |
| `failed-delivery.test.ts` | Reason required, FAILED→RESCHEDULED→ASSIGNED, attempts remain independent |
| `auth.test.ts` | Register schema rejects `role`; password/phone/email rules |
| `cookies.test.ts` | `JWT_EXPIRES_IN` → maxAge |
| `email-templates.test.ts` | Subject/body for order events |
| `cors-origin.test.ts` | Localhost, configured origin, `*.vercel.app` |

---

## 22. Deployment

Repo: [https://github.com/akhibabu/LastMile](https://github.com/akhibabu/LastMile).

| Surface | Current URL |
| --- | --- |
| Frontend | https://last-mile-frontend.vercel.app |
| Backend | https://lastmile-api-4xox.onrender.com |
| API docs | https://lastmile-api-4xox.onrender.com/api/docs |
| Health | https://lastmile-api-4xox.onrender.com/health |

If you fork the project, replace those hosts. Placeholders:

Frontend URL: `https://<your-app>.vercel.app`

Backend URL: `https://<your-service>.onrender.com`

API docs URL: `https://<your-service>.onrender.com/api/docs`

### PostgreSQL

Use any hosted Postgres. Set `DATABASE_URL` on the API host. Run `npx prisma migrate deploy` (Render start command already does this). Seed once against that database (`npm run db:seed` from `backend` with the same `DATABASE_URL`). Render free instances have no shell — seed from a laptop with the hosted URL in the environment, not from a committed file.

### Backend (Render)

From `render.yaml`:

| Setting | Value |
| --- | --- |
| Root directory | `backend` |
| Runtime | Node (`NODE_VERSION=20`) |
| Build | `npm install --include=dev && npx prisma generate && npm run build` |
| Start | `npx prisma migrate deploy && npm start` |
| Health check | `/health` |

`--include=dev` is required so `tsc` can run while `NODE_ENV=production` would otherwise skip some install behavior. `typescript` and `@types/node` are also listed in backend `dependencies` for that reason.

Environment on Render: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN=7d`, `FRONTEND_URL=https://last-mile-frontend.vercel.app` (comma-separate extra origins), `BACKEND_URL=https://lastmile-api-4xox.onrender.com`, optional `RESEND_API_KEY`.

CORS also allows any `https://*.vercel.app` host so preview deployments work. Free Render services sleep when idle; the first request can take ~30s.

### Frontend (Vercel)

From `frontend/vercel.json` and `frontend/.env.production`:

| Setting | Value |
| --- | --- |
| Root directory | `frontend` |
| Framework | Vite |
| Rewrites | SPA → `index.html` (except `/assets/`) |
| Production `VITE_API_URL` | `https://lastmile-api-4xox.onrender.com/api` |

`VITE_*` is inlined at **build** time. Changing the API URL requires a new frontend build.

---

## 23. Demo accounts

There are **no** committed customer or agent passwords.

| Role | How |
| --- | --- |
| Customer | `/register` — name, email, phone, password (min 8) |
| Admin | Set `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` in `backend/.env`, then `npm run db:seed`. If that email already exists, the password is not changed. |
| Agent | Admin → Agents → add name, email, password |

Do not paste production or personal passwords into this file. Use whatever you configured locally or on the hosted database.

---

## 24. Recommended demo flow

1. Sign up as a customer (or log in if you already did).
2. **New order**. Pick Gachibowli `500084` → Hitech City `500081` from the locality list.
3. Enter **100 × 100 × 100 cm**, **10 kg**, **B2C**, **COD**.
4. Review the preview: volumetric 200 kg, shipping 2055, COD 40, **₹2095.00**, card `B2C HYD_WEST → HYD_WEST`.
5. Confirm. Status `CREATED`. Notification row (and email if Resend is configured).
6. Log in as admin. Open the order. Create an **available** agent if none exist; optionally enable location sharing on the agent dashboard.
7. **Auto-assign** (or pick an agent). Status `ASSIGNED`.
8. Agent: `PICKED_UP` → `IN_TRANSIT` → `OUT_FOR_DELIVERY`.
9. Customer: timeline on order detail.
10. Agent: **Mark failed** with a reason (e.g. `CUSTOMER_UNAVAILABLE`).
11. Customer: reschedule a new datetime. Expect `RESCHEDULED` then `ASSIGNED` if an agent is free. Original failed attempt remains.
12. Agent: walk to `DELIVERED`. Inspect attempts (`FAILED` + `RESCHEDULED` + `SUCCESS`) and history.

---

## 25. Known limitations

| Limitation | Why | Possible extension |
| --- | --- | --- |
| Email needs `RESEND_API_KEY` in production; otherwise rows are `FAILED` | Avoid claiming SENT when nothing was delivered | Configure Resend (and a verified `FROM_EMAIL`) |
| `EMAIL_PROVIDER` sendgrid/mailgun values are not implemented | Only Resend + dev + unconfigured providers exist | Additional providers behind the same `EmailProvider` interface |
| SMS / IN_APP channels are schema-only | `NotificationService` always uses `EMAIL` | Extra dispatchers |
| Nominatim is unused by zone resolution | Pincode mapping is the product rule | Optional reverse-geocode assist, still not a silent zone guess |
| Location is near-real-time (browser `watchPosition` + admin poll), not a GPS stream | No WebSocket layer | Push or shorter poll if needed |
| Tests do not hit Postgres or HTTP | Fast, deterministic unit tests | Integration tests later |
| Re-seed wipes rate cards | Seed `deleteMany` then inserts 50 exact cards | Separate seed vs. “reset rates” |
| Agent UI has no notifications page | API `GET /api/notifications` works for agents; routes only expose inboxes for customer and admin | Add an agent inbox route |
| Render free sleep | Platform plan | Paid instance or warm-up ping |
| Leaflet loaded from unpkg CDN | Not an npm dependency | Bundle if offline maps are required |

---

## 26. Design decisions

- **Server-side pricing** — preview and create call the same service; a crafted `totalCharge` cannot be trusted.
- **Database-driven zones and cards** — Hyderabad geography and INR rates live in Postgres, not in React constants. Admins can add a pincode or fallback card without a deploy of business numbers (the volumetric **formula** stays in code).
- **Immutable history** — `OrderStatusHistory` is insert-only so a failed attempt stays visible after a later success.
- **Assignment as a service** — eligibility, freshness, and Haversine stay out of controllers; the same rules apply to reschedule reassignment.
- **Role in the JWT, enforced on the API** — register cannot self-promote; customers cannot set another `customerId`.
- **HTTP-only cookie** — XSS cannot read the JWT from JavaScript. Cross-site deploys use `SameSite=None` + `Secure`.

---

## 27. Troubleshooting

| Symptom | What to check |
| --- | --- |
| `Invalid environment configuration` | `DATABASE_URL` set; `JWT_SECRET` ≥ 16 chars; `backend/.env` present when starting the API |
| Prisma migrate / P1001 | Postgres running (`npm run db:up`); URL user/password/db `lastmile`; hosted migrate using a direct (non-pooler) URL if needed |
| Seed skips admin | Both `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in `backend/.env`; password length ≥ 8; email not already present |
| `MISSING_RATE_CARD` | Seed ran; both pincodes map to active zones; for new geographies add an exact card or an `isFallback` card |
| `ZONE_UNRESOLVED` | Pincode not in `ZoneArea`, or parent zone inactive (`HYD_EXPANDING`) |
| Locality dropdown empty | API reachable; `GET /api/locations` public; seed applied |
| Login works in curl but not in the browser | CORS: add the page origin to `FRONTEND_URL` or use localhost / `*.vercel.app`; production cookies need HTTPS |
| Cookie not sent | Frontend `VITE_API_URL` must be the API origin; Axios `withCredentials`; for Vercel+Render, API `NODE_ENV=production` |
| Vite on 5174 | Allowed automatically; no env change required |
| Emails `LOGGED` / `FAILED` | Expected without Resend; set `RESEND_API_KEY` and a Resend-valid `FROM_EMAIL` |
| Render 30s hang | Free instance waking from sleep |
| Production build talks to the wrong API | `VITE_API_URL` is compile-time; rebuild the frontend |

---

## Extra references

- [`SYSTEM_DESIGN.md`](SYSTEM_DESIGN.md) — shorter design note aligned with this implementation
- [`docs/API.md`](docs/API.md) — compact endpoint list
- [`docs/SCHEMA.md`](docs/SCHEMA.md) — schema companion
- [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)

---

## Source zip

Download the project source (no `node_modules`, no `.git`, no local `.env` files):

- In this repo: [LastMile.zip](LastMile.zip)
- From GitHub: [https://github.com/akhibabu/LastMile/archive/refs/heads/main.zip](https://github.com/akhibabu/LastMile/archive/refs/heads/main.zip)

Unzip, then follow [Local setup](#7-local-setup): copy the `.env.example` files, start Postgres, migrate, seed, and run `npm install` / `npm run dev`.
