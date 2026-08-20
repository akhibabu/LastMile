# System Design — LastMile Delivery Platform

This note describes how the running system actually prices, assigns, tracks, and stores last-mile orders. The implementation is a React SPA talking to an Express REST API with Prisma on PostgreSQL. Authorization is a server-signed JWT stored in an HTTP-only cookie; the browser role is never trusted.

## Rate calculation engine

Pricing is a dedicated service (`PricingService`) wrapping pure functions in `src/lib/pricing.ts`. Nothing in the UI or route layer computes money.

An order quote always starts from live zone resolution and live rate cards. Volumetric weight is `(length × breadth × height) / divisor`. The divisor defaults to 5000 and is stored on the rate card so it is configurable without a code change. Billable weight is the max of actual weight, volumetric weight, and the card’s minimum chargeable weight.

Scope is intra-zone when pickup and drop resolve to the same zone, otherwise inter-zone. Card selection is configuration-driven:

1. Exact active zone-pair card for that order type and scope (`EXACT_ZONE_PAIR`)
2. Explicit admin-configured fallback card for that order type and scope (`INTRA_ZONE_FALLBACK` or `INTER_ZONE_FALLBACK`)
3. Otherwise `MISSING_RATE_CARD` — no hidden default, no invented price

Shipping charge is `baseRate + billableWeight × perKgRate`. COD surcharge is taken from the same card only when payment type is COD. Quotes include `rateCardName` and `resolutionType`.

Preview (`POST /api/orders/preview-price`) and create share this path. Create recalculates on the server and refuses the order with `MISSING_RATE_CARD` if no card applies. Clients cannot submit a homemade total.

## Zone detection

Zones and pincode/area rows are admin-managed tables, not frontend constants. `ZoneResolutionService` treats the 6-digit pincode as authoritative, looks up `ZoneArea`, and returns the mapped zone. If the address names a locality that belongs to a different zone, it returns `ADDRESS_PINCODE_MISMATCH`. Unmapped pincodes return `ZONE_UNRESOLVED`. The service does not geocode to the nearest unrelated city.

## Near-real-time agent location

Agents enable location sharing in the dashboard. The browser uses `navigator.geolocation.watchPosition()` and throttles writes to `PATCH /api/agents/me/location`. The backend identifies the agent from the authenticated cookie — the client cannot send an arbitrary `agentId`. Each write updates `currentLatitude`, `currentLongitude`, and `locationUpdatedAt`, and appends `AgentLocation` history.

Admin views poll the agents API. Locations older than `LOCATION_STALE_THRESHOLD` are marked stale/unavailable and are not used for nearest-agent ranking. This is near-real-time browser geolocation, not a continuous GPS stream.

## Auto-assignment

`AssignmentService.assignNearestAgent` loads agents with current location, availability, freshness, and in-flight order counts. An agent is eligible only if status is AVAILABLE, `isAvailable` is true, and active orders are below `maxActiveOrders`. Priority: available → active → fresh location → nearest pickup by Haversine → same-zone fallback → any eligible agent. The write path sets the order to ASSIGNED, marks the agent BUSY, and appends history with reason, distance, and whether the location was fresh. Manual assign uses the same eligibility rules. Unassign is allowed only before pickup.

## Failed delivery handling

The status machine is explicit. Agents may mark FAILED only from OUT_FOR_DELIVERY and must supply a reason. That write creates a `DeliveryAttempt` (FAILED) and an append-only history row, then notifies the customer. Reschedule is allowed only from FAILED: a `RescheduleRequest` is stored, another attempt row (RESCHEDULED) is stored, the order moves to RESCHEDULED with a new date, and auto-assignment is attempted again. Previous attempts are never updated. A later SUCCESS attempt is a new row, which is how the original failure stays visible on the timeline.

## Email notifications

`NotificationService` calls `EmailService`, which calls `ResendProvider` when `RESEND_API_KEY` is present. Templates live in `services/email/templates.ts`. Development without a key logs the payload and stores `LOGGED`. Production without a key stores `FAILED` and does not fail the order. `SENT` is used only after Resend accepts the request. Admins can retry a failed row without creating a new order event.

## Authentication

Login and register sign a JWT and set `access_token` as an HTTP-only cookie (`secure` and `SameSite=None` in production, `SameSite=Lax` locally). The JSON body returns the public user only. Middleware reads `req.cookies.access_token` and verifies the JWT server-side. Logout clears the cookie. The SPA uses `GET /api/auth/me` with `credentials: include` and does not store the JWT in `localStorage` or `sessionStorage`. CORS is origin-restricted with `credentials: true`.

## Database architecture

The schema is normalized around `User` (role), `CustomerProfile`, `AgentProfile`, `Zone` + `ZoneArea`, `RateCard` (including `isFallback`), `Order`, `OrderStatusHistory`, `DeliveryAttempt`, `RescheduleRequest`, `AgentLocation`, and `Notification` (`sentAt`, statuses `PENDING` / `SENT` / `FAILED` / `LOGGED`). Foreign keys and indexes cover customer, agent, status, zones, and time. History has no update/delete API; application code only `create`s rows. Money and weights are decimals. Prisma keeps queries parameterized.

## API architecture

REST under `/api`, JSON envelope `{ success, data, message }`. Zod validates bodies. Controllers stay thin; services own pricing, assignment, tracking, notifications, email, location, and zone resolution. Swagger is served at `/api/docs`. Dashboard metrics are SQL aggregations (`count` / `sum`), not client-side folds over full order lists.
