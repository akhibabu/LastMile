import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { AppError, ForbiddenError, NotFoundError } from "../utils/errors.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import { pricingService, type QuoteRequest } from "./pricing.service.js";
import { trackingService } from "./tracking.service.js";
import { assignmentService } from "./assignment.service.js";
import { notificationService } from "./notification.service.js";

const orderInclude = {
  customer: { select: { id: true, name: true, email: true, phone: true } },
  assignedAgent: {
    include: { user: { select: { id: true, name: true, email: true, phone: true } }, currentZone: true },
  },
  pickupZone: true,
  dropZone: true,
  statusHistory: {
    include: { actor: { select: { id: true, name: true, role: true } } },
    orderBy: { timestamp: "asc" as const },
  },
  attempts: { orderBy: { attemptedAt: "asc" as const } },
  reschedules: { orderBy: { createdAt: "asc" as const } },
} satisfies Prisma.OrderInclude;

export class OrderService {
  async preview(input: QuoteRequest) {
    return pricingService.quote(input);
  }

  async create(input: QuoteRequest & { customerId: string; actorId: string; notes?: string }) {
    const quote = await pricingService.quote(input);

    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        customerId: input.customerId,
        pickupAddress: input.pickupAddress,
        pickupPincode: quote.pickup.pincode,
        pickupLatitude: quote.pickup.latitude,
        pickupLongitude: quote.pickup.longitude,
        dropAddress: input.dropAddress,
        dropPincode: quote.drop.pincode,
        dropLatitude: quote.drop.latitude,
        dropLongitude: quote.drop.longitude,
        pickupZoneId: quote.pickupZone.id,
        dropZoneId: quote.dropZone.id,
        length: input.length,
        breadth: input.breadth,
        height: input.height,
        actualWeight: input.actualWeight,
        volumetricWeight: quote.volumetricWeight,
        billableWeight: quote.billableWeight,
        orderType: input.orderType,
        paymentType: input.paymentType,
        rateCardId: quote.rateCardId,
        baseCharge: quote.baseRate,
        perKgRate: quote.perKgRate,
        shippingCharge: quote.shippingCharge,
        codSurcharge: quote.codSurcharge,
        totalCharge: quote.totalCharge,
        status: "CREATED",
        notes: input.notes,
      },
      include: orderInclude,
    });

    await trackingService.appendHistory({
      orderId: order.id,
      status: "CREATED",
      actorId: input.actorId,
      note: "Order confirmed after price preview",
      metadata: { totalCharge: quote.totalCharge, rateCardId: quote.rateCardId },
    });

    logger.info({ orderId: order.id, orderNumber: order.orderNumber }, "order created");
    await notificationService.sendStatusNotification(order.id, "CREATED");

    return prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
  }

  async getById(id: string, actor: { id: string; role: string }) {
    const order = await prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!order) throw new NotFoundError("Order not found");
    await this.assertCanView(order, actor);
    return order;
  }

  async list(
    actor: { id: string; role: string },
    filters: {
      status?: OrderStatus;
      zoneId?: string;
      agentId?: string;
      orderType?: "B2B" | "B2C";
      paymentType?: "PREPAID" | "COD";
      customerId?: string;
    },
  ) {
    const where: Prisma.OrderWhereInput = {};

    if (actor.role === "CUSTOMER") {
      where.customerId = actor.id;
    } else if (actor.role === "AGENT") {
      const profile = await prisma.agentProfile.findUnique({ where: { userId: actor.id } });
      if (!profile) throw new ForbiddenError("Agent profile missing");
      where.assignedAgentId = profile.id;
    } else {
      if (filters.customerId) where.customerId = filters.customerId;
      if (filters.agentId) where.assignedAgentId = filters.agentId;
    }

    if (filters.status) where.status = filters.status;
    if (filters.orderType) where.orderType = filters.orderType;
    if (filters.paymentType) where.paymentType = filters.paymentType;
    if (filters.zoneId) {
      where.OR = [{ pickupZoneId: filters.zoneId }, { dropZoneId: filters.zoneId }];
    }

    return prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async assign(orderId: string, agentId: string, actorId: string) {
    const result = await assignmentService.assignManually(orderId, agentId, actorId);
    await notificationService.sendStatusNotification(orderId, "ASSIGNED");
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    return { order, assignment: result };
  }

  async autoAssign(orderId: string, actorId: string) {
    const result = await assignmentService.assignNearestAgent(orderId, actorId);
    await notificationService.sendStatusNotification(orderId, "ASSIGNED");
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    return { order, assignment: result };
  }

  async unassign(orderId: string, actorId: string) {
    await assignmentService.unassign(orderId, actorId);
    return prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
  }

  async updateStatus(params: {
    orderId: string;
    nextStatus: OrderStatus;
    actorId: string;
    actorRole: "ADMIN" | "AGENT" | "CUSTOMER";
    note?: string;
    reason?: "CUSTOMER_UNAVAILABLE" | "WRONG_ADDRESS" | "ACCESS_ISSUE" | "CUSTOMER_REFUSED" | "OTHER";
    override?: boolean;
  }) {
    const order = await trackingService.changeStatus(params);
    if (params.nextStatus === "DELIVERED" && order.assignedAgentId) {
      await assignmentService.refreshAgentAvailability(order.assignedAgentId);
    }
    if (params.nextStatus === "FAILED" && order.assignedAgentId) {
      await assignmentService.refreshAgentAvailability(order.assignedAgentId);
    }
    await notificationService.sendStatusNotification(order.id, params.nextStatus, params.reason);
    return prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
  }

  async reschedule(params: {
    orderId: string;
    actorId: string;
    actorRole: "ADMIN" | "AGENT" | "CUSTOMER";
    scheduledDeliveryDate: Date;
    note?: string;
  }) {
    const order = await prisma.order.findUnique({ where: { id: params.orderId } });
    if (!order) throw new NotFoundError("Order not found");
    if (params.actorRole === "CUSTOMER" && order.customerId !== params.actorId) {
      throw new ForbiddenError();
    }
    if (order.status !== "FAILED") {
      throw new AppError("Only failed deliveries can be rescheduled", 422, "INVALID_STATUS");
    }

    await prisma.rescheduleRequest.create({
      data: {
        orderId: order.id,
        requestedById: params.actorId,
        previousDate: order.scheduledDeliveryDate,
        newDate: params.scheduledDeliveryDate,
        note: params.note,
      },
    });

    const attemptCount = await prisma.deliveryAttempt.count({ where: { orderId: order.id } });
    await prisma.deliveryAttempt.create({
      data: {
        orderId: order.id,
        agentId: order.assignedAgentId,
        attemptNumber: attemptCount + 1,
        status: "RESCHEDULED",
        notes: params.note,
        rescheduledDate: params.scheduledDeliveryDate,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "RESCHEDULED",
        scheduledDeliveryDate: params.scheduledDeliveryDate,
        assignedAgentId: null,
      },
    });

    if (order.assignedAgentId) {
      await assignmentService.refreshAgentAvailability(order.assignedAgentId);
    }

    await trackingService.appendHistory({
      orderId: order.id,
      status: "RESCHEDULED",
      actorId: params.actorId,
      note: params.note ?? `Rescheduled for ${params.scheduledDeliveryDate.toISOString()}`,
      metadata: { scheduledDeliveryDate: params.scheduledDeliveryDate.toISOString() },
    });

    logger.info({ orderId: order.id }, "reschedule created");
    await notificationService.sendStatusNotification(
      order.id,
      "RESCHEDULED",
      `New date: ${params.scheduledDeliveryDate.toDateString()}`,
    );

    let assignment = null;
    try {
      assignment = await assignmentService.assignNearestAgent(order.id, params.actorId);
      await notificationService.sendStatusNotification(order.id, "ASSIGNED");
    } catch {
      logger.warn({ orderId: order.id }, "reschedule created but no agent available for auto-reassign");
    }

    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: orderInclude });
    return { order: updated, assignment };
  }

  async dashboard(actor: { id: string; role: string }) {
    if (actor.role === "ADMIN") {
      const [
        totalOrders,
        activeOrders,
        deliveredOrders,
        failedOrders,
        cancelledOrders,
        availableAgents,
        busyAgents,
        revenueAgg,
        codOrders,
      ] = await Promise.all([
        prisma.order.count(),
        prisma.order.count({
          where: { status: { in: ["CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "RESCHEDULED"] } },
        }),
        prisma.order.count({ where: { status: "DELIVERED" } }),
        prisma.order.count({ where: { status: "FAILED" } }),
        prisma.order.count({ where: { status: "CANCELLED" } }),
        prisma.agentProfile.count({ where: { status: "AVAILABLE", isAvailable: true } }),
        prisma.agentProfile.count({ where: { status: "BUSY" } }),
        prisma.order.aggregate({ _sum: { totalCharge: true } }),
        prisma.order.count({ where: { paymentType: "COD" } }),
      ]);

      return {
        totalOrders,
        activeOrders,
        deliveredOrders,
        failedOrders,
        cancelledOrders,
        availableAgents,
        busyAgents,
        revenue: Number(revenueAgg._sum.totalCharge ?? 0),
        codOrders,
      };
    }

    if (actor.role === "CUSTOMER") {
      const where = { customerId: actor.id };
      const [totalOrders, activeOrders, deliveredOrders, failedOrders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.count({
          where: {
            ...where,
            status: { in: ["CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "RESCHEDULED"] },
          },
        }),
        prisma.order.count({ where: { ...where, status: "DELIVERED" } }),
        prisma.order.count({ where: { ...where, status: "FAILED" } }),
      ]);
      const recent = await prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: "desc" },
        take: 8,
      });
      return { totalOrders, activeOrders, deliveredOrders, failedOrders, recent };
    }

    const profile = await prisma.agentProfile.findUnique({ where: { userId: actor.id } });
    if (!profile) throw new ForbiddenError("Agent profile missing");
    const where = { assignedAgentId: profile.id };
    const [assigned, active, completed, failed] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.count({
        where: { ...where, status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "RESCHEDULED"] } },
      }),
      prisma.order.count({ where: { ...where, status: "DELIVERED" } }),
      prisma.order.count({ where: { ...where, status: "FAILED" } }),
    ]);
    const current = await prisma.order.findMany({
      where: { ...where, status: { notIn: ["DELIVERED", "CANCELLED"] } },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });
    return {
      assignedOrders: assigned,
      activeDeliveries: active,
      completedDeliveries: completed,
      failedDeliveries: failed,
      agent: profile,
      current,
    };
  }

  private async assertCanView(
    order: { customerId: string; assignedAgentId: string | null },
    actor: { id: string; role: string },
  ) {
    if (actor.role === "ADMIN") return;
    if (actor.role === "CUSTOMER" && order.customerId === actor.id) return;
    if (actor.role === "AGENT") {
      const profile = await prisma.agentProfile.findUnique({ where: { userId: actor.id } });
      if (profile && order.assignedAgentId === profile.id) return;
    }
    throw new ForbiddenError();
  }
}

export const orderService = new OrderService();
