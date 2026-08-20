# Database schema (Prisma / PostgreSQL)

Core entities and how they relate:

```
User 1──1 CustomerProfile
User 1──1 AgentProfile ── Zone (current)
Zone 1──* ZoneArea          (pincode / area mappings)
RateCard *── Zone           (optional source & destination)
User 1──* Order             (customer)
AgentProfile 1──* Order     (assignee, nullable)
Order 1──* OrderStatusHistory   (append-only)
Order 1──* DeliveryAttempt
Order 1──* RescheduleRequest
Order 1──* Notification
AgentProfile 1──* AgentLocation
```

History rows are never updated or deleted by application code. Rate amounts and the volumetric divisor live on `RateCard`, not in source constants (except the documented default of 5000). `RateCard.isFallback` marks an explicit intra/inter-zone fallback. `Notification.sentAt` is set only when Resend confirms delivery.
