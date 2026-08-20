export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "LastMile Delivery API",
    version: "1.0.0",
    description:
      "REST API for the Last-Mile Delivery Management Platform. Authenticate with POST /api/auth/login and send `Authorization: Bearer <token>`.",
  },
  servers: [{ url: "/api", description: "API root" }],
  tags: [
    { name: "Auth" },
    { name: "Orders" },
    { name: "Agents" },
    { name: "Zones" },
    { name: "Rate Cards" },
    { name: "Notifications" },
    { name: "Admin" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      ApiSuccess: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data: { type: "object" },
        },
      },
      ApiError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          code: { type: "string" },
          errors: { type: "array", items: { type: "object" } },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        properties: {
          email: { type: "string", example: "you@example.com" },
          password: { type: "string", example: "your-password" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["name", "email", "password"],
        properties: {
          name: { type: "string" },
          email: { type: "string" },
          password: { type: "string" },
          phone: { type: "string" },
        },
      },
      OrderPreviewRequest: {
        type: "object",
        required: [
          "pickupAddress",
          "pickupPincode",
          "dropAddress",
          "dropPincode",
          "length",
          "breadth",
          "height",
          "actualWeight",
          "orderType",
          "paymentType",
        ],
        properties: {
          pickupAddress: { type: "string", example: "Gachibowli, Hyderabad" },
          pickupPincode: { type: "string", example: "500084" },
          dropAddress: { type: "string", example: "Hitech City, Hyderabad" },
          dropPincode: { type: "string", example: "500081" },
          length: { type: "number", example: 40 },
          breadth: { type: "number", example: 30 },
          height: { type: "number", example: 20 },
          actualWeight: { type: "number", example: 3 },
          orderType: { type: "string", enum: ["B2B", "B2C"] },
          paymentType: { type: "string", enum: ["PREPAID", "COD"] },
        },
      },
    },
  },
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a customer account",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/RegisterRequest" } } } },
        responses: {
          "201": { description: "Account created" },
          "409": { description: "Email already exists" },
        },
      },
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and receive a JWT",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/LoginRequest" } } } },
        responses: {
          "200": { description: "JWT and user profile" },
          "401": { description: "Invalid credentials" },
        },
      },
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        security: [{ bearerAuth: [] }],
        summary: "Current user",
        responses: { "200": { description: "User" }, "401": { description: "Unauthorized" } },
      },
    },
    "/orders/preview-price": {
      post: {
        tags: ["Orders"],
        security: [{ bearerAuth: [] }],
        summary: "Calculate zones, weights, and charges without creating an order",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/OrderPreviewRequest" } } } },
        responses: {
          "200": { description: "Pricing breakdown" },
          "422": { description: "Zone unresolved or missing rate card" },
        },
      },
    },
    "/orders": {
      get: {
        tags: ["Orders"],
        security: [{ bearerAuth: [] }],
        summary: "List orders for the current role",
        parameters: [
          { name: "status", in: "query", schema: { type: "string" } },
          { name: "zoneId", in: "query", schema: { type: "string" } },
          { name: "agentId", in: "query", schema: { type: "string" } },
          { name: "orderType", in: "query", schema: { type: "string" } },
          { name: "paymentType", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Order list" } },
      },
      post: {
        tags: ["Orders"],
        security: [{ bearerAuth: [] }],
        summary: "Create order after confirming the price (CUSTOMER or ADMIN)",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/OrderPreviewRequest" } } } },
        responses: { "201": { description: "Order created with status CREATED" } },
      },
    },
    "/orders/{id}": {
      get: {
        tags: ["Orders"],
        security: [{ bearerAuth: [] }],
        summary: "Get order details",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Order" }, "404": { description: "Not found" } },
      },
    },
    "/orders/{id}/tracking": {
      get: {
        tags: ["Orders"],
        security: [{ bearerAuth: [] }],
        summary: "Immutable tracking timeline",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Timeline" } },
      },
    },
    "/orders/{id}/assign": {
      post: {
        tags: ["Orders"],
        security: [{ bearerAuth: [] }],
        summary: "Manually assign an agent (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", properties: { agentId: { type: "string" } } } } },
        },
        responses: { "200": { description: "Assigned" }, "422": { description: "Agent unavailable" } },
      },
    },
    "/orders/{id}/auto-assign": {
      post: {
        tags: ["Orders"],
        security: [{ bearerAuth: [] }],
        summary: "Assign nearest available agent (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Assigned with distance and reason" } },
      },
    },
    "/orders/{id}/status": {
      post: {
        tags: ["Orders"],
        security: [{ bearerAuth: [] }],
        summary: "Advance or override order status",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  note: { type: "string" },
                  reason: { type: "string" },
                  override: { type: "boolean" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Updated" }, "422": { description: "Invalid transition" } },
      },
    },
    "/orders/{id}/reschedule": {
      post: {
        tags: ["Orders"],
        security: [{ bearerAuth: [] }],
        summary: "Reschedule a failed delivery",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  scheduledDeliveryDate: { type: "string", format: "date-time" },
                  note: { type: "string" },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Rescheduled and reassigned if possible" } },
      },
    },
    "/agents": {
      get: {
        tags: ["Agents"],
        security: [{ bearerAuth: [] }],
        summary: "List agents (ADMIN)",
        responses: { "200": { description: "Agents" } },
      },
      post: {
        tags: ["Agents"],
        security: [{ bearerAuth: [] }],
        summary: "Create an agent account (ADMIN)",
        responses: { "201": { description: "Created" } },
      },
    },
    "/agents/available": {
      get: {
        tags: ["Agents"],
        security: [{ bearerAuth: [] }],
        summary: "List available agents (ADMIN)",
        responses: { "200": { description: "Available agents" } },
      },
    },
    "/agents/{id}/location": {
      patch: {
        tags: ["Agents"],
        security: [{ bearerAuth: [] }],
        summary: "Update agent lat/lng (self or ADMIN). Use id=me for the current agent.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["latitude", "longitude"],
                properties: { latitude: { type: "number" }, longitude: { type: "number" }, zoneId: { type: "string" } },
              },
            },
          },
        },
        responses: { "200": { description: "Updated" } },
      },
    },
    "/agents/{id}/availability": {
      patch: {
        tags: ["Agents"],
        security: [{ bearerAuth: [] }],
        summary: "Update availability",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated" } },
      },
    },
    "/locations": {
      get: {
        tags: ["Zones"],
        security: [{ bearerAuth: [] }],
        summary: "List supported pickup and drop localities",
        parameters: [{ name: "q", in: "query", schema: { type: "string", example: "gachi" } }],
        responses: { "200": { description: "Locations from ZoneArea rows" } },
      },
    },
    "/locations/search": {
      get: {
        tags: ["Zones"],
        security: [{ bearerAuth: [] }],
        summary: "Search supported localities by area, city, or pincode",
        parameters: [{ name: "q", in: "query", required: true, schema: { type: "string", example: "gachi" } }],
        responses: { "200": { description: "Matching locations" } },
      },
    },
    "/zones": {
      get: {
        tags: ["Zones"],
        security: [{ bearerAuth: [] }],
        summary: "List zones and pincode mappings",
        responses: { "200": { description: "Zones" } },
      },
      post: {
        tags: ["Zones"],
        security: [{ bearerAuth: [] }],
        summary: "Create zone (ADMIN)",
        responses: { "201": { description: "Created" } },
      },
    },
    "/zones/lookup": {
      get: {
        tags: ["Zones"],
        security: [{ bearerAuth: [] }],
        summary: "Resolve a pincode to its mapped zone",
        parameters: [{ name: "pincode", in: "query", required: true, schema: { type: "string", example: "500084" } }],
        responses: {
          "200": { description: "Mapped zone" },
          "404": { description: "Pincode is not mapped" },
        },
      },
    },
    "/zones/{id}": {
      put: {
        tags: ["Zones"],
        security: [{ bearerAuth: [] }],
        summary: "Update zone (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Zones"],
        security: [{ bearerAuth: [] }],
        summary: "Deactivate zone (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deactivated" } },
      },
    },
    "/zones/{id}/areas": {
      post: {
        tags: ["Zones"],
        security: [{ bearerAuth: [] }],
        summary: "Map a pincode or area to a zone (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "201": { description: "Mapped" } },
      },
    },
    "/rate-cards": {
      get: {
        tags: ["Rate Cards"],
        security: [{ bearerAuth: [] }],
        summary: "List rate cards",
        responses: { "200": { description: "Rate cards" } },
      },
      post: {
        tags: ["Rate Cards"],
        security: [{ bearerAuth: [] }],
        summary: "Create rate card (ADMIN)",
        responses: { "201": { description: "Created" } },
      },
    },
    "/rate-cards/{id}": {
      put: {
        tags: ["Rate Cards"],
        security: [{ bearerAuth: [] }],
        summary: "Update rate card (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Rate Cards"],
        security: [{ bearerAuth: [] }],
        summary: "Delete rate card (ADMIN)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        security: [{ bearerAuth: [] }],
        summary: "List notifications for the current user (admins see all)",
        responses: { "200": { description: "Notifications" } },
      },
    },
    "/admin/dashboard": {
      get: {
        tags: ["Admin"],
        security: [{ bearerAuth: [] }],
        summary: "Aggregated dashboard metrics for the current role",
        responses: { "200": { description: "Metrics" } },
      },
    },
  },
};
