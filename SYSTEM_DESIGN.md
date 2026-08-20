# System Design — LastMile Delivery Platform

This note describes how the running system actually prices, assigns, tracks, and stores last-mile orders. The implementation is a React SPA talking to an Express REST API with Prisma on PostgreSQL. Authorization is JWT + server-side role checks; the browser role is never trusted.

## Rate calculation engine

Pricing is a dedicated service (`PricingService`) wrapping pure functions in `src/lib/pricing.ts`. Nothing in the UI or route layer computes money.

An order quote always starts from live zone resolution and live rate cards. Volumetric weight is `(length × breadth × height) / divisor`. The divisor defaults to 5000 and is stored on the rate card so it is configurable without a code change. Billable weight is the max of actual weight, volumetric weight, and the card’s minimum chargeable weight.

Scope is intra-zone when pickup and drop resolve to the same zone, otherwise inter-zone. Card selection requires an active rate card for that order type, scope, and **exact** source/destination zone pair. There is no source-only or global fallback; a missing card returns `MISSING_RATE_CARD` and no price is invented. Shipping charge is `baseRate + billableWeight × perKgRate`. COD surcharge is taken from the same card only when payment type is COD.

Preview (`POST /api/orders/preview-price`) and create share this path. Create recalculates on the server and refuses the order with `MISSING_RATE_CARD` if no card applies. Clients cannot submit a homemade total.

## Zone detection

Zones and pincode/area rows are admin-managed tables, not frontend constants. `ZoneResolutionService` treats the 6-digit pincode as authoritative, looks up `ZoneArea`, and returns the mapped zone. If the address names a locality that belongs to a different zone, it returns `ADDRESS_PINCODE_MISMATCH`. Unmapped pincodes return `ZONE_UNRESOLVED`. The service does not geocode to the nearest unrelated city.

## Auto-assignment

`AssignmentService.assignNearestAgent` loads agents with current location, availability, and in-flight order counts. An agent is eligible only if status is AVAILABLE, `isAvailable` is true, and active orders are below `maxActiveOrders`. When both the pickup point and the agent have coordinates, the winner is the minimum Haversine distance; equal distances break on agent id so the choice is replayable. Without coordinates the service prefers the same pickup zone, then any eligible agent. The write path sets the order to ASSIGNED, marks the agent BUSY, and appends history with reason and distance. Manual assign uses the same eligibility rules. Unassign is allowed only before pickup.

## Failed delivery handling

The status machine is explicit. Agents may mark FAILED only from OUT_FOR_DELIVERY and must supply a reason. That write creates a `DeliveryAttempt` (FAILED) and an append-only history row, then notifies the customer. Reschedule is allowed only from FAILED: a `RescheduleRequest` is stored, another attempt row (RESCHEDULED) is stored, the order moves to RESCHEDULED with a new date, and auto-assignment is attempted again. Previous attempts are never updated. A later SUCCESS attempt is a new row, which is how the original failure stays visible on the timeline.

## Database architecture

The schema is normalized around `User` (role), `CustomerProfile`, `AgentProfile`, `Zone` + `ZoneArea`, `RateCard`, `Order`, `OrderStatusHistory`, `DeliveryAttempt`, `RescheduleRequest`, `AgentLocation`, and `Notification`. Foreign keys and indexes cover customer, agent, status, zones, and time. History has no update/delete API; application code only `create`s rows. Money and weights are decimals. Prisma keeps queries parameterized.

## API architecture

REST under `/api`, JSON envelope `{ success, data, message }`. Zod validates bodies. Controllers stay thin; services own pricing, assignment, tracking, notifications, and zone resolution. Swagger is served at `/api/docs`. Dashboard metrics are SQL aggregations (`count` / `sum`), not client-side folds over full order lists. Email and geocoding sit behind provider interfaces so Resend or Nominatim can be replaced without touching controllers.
