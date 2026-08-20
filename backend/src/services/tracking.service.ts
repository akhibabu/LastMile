import type { FailureReason, OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { assertTransition, type OrderStatus as DomainStatus } from "../lib/tracking.js";

interface AppendHistoryInput {
  orderId: string;
  status: OrderStatus;
  actorId?: string | null;
  note?: string | null;
  metadata?: Prisma.InputJsonValue;
}

export class TrackingService {
  async appendHistory(input: AppendHistoryInput) {
    const record = await prisma.orderStatusHistory.create({
      data: {
        orderId: input.orderId,
        status: input.status,
        actorId: input.actorId ?? null,
        note: input.note ?? null,
        metadata: input.metadata ?? undefined,
      },
    });
    logger.info(
      { orderId: input.orderId, status: input.status, actorId: input.actorId },
      "status changed",
    );
    return record;
  }

  async getTimeline(orderId: string) {
    return prisma.orderStatusHistory.findMany({
      where: { orderId },
      include: { actor: { select: { id: true, name: true, role: true, email: true } } },
      orderBy: { timestamp: "asc" },
    });
  }

  async changeStatus(params: {
    orderId: string;
    nextStatus: OrderStatus;
    actorId: string;
    actorRole: "ADMIN" | "AGENT" | "CUSTOMER";
    note?: string;
    reason?: FailureReason;
    override?: boolean;
  }) {
    const order = await prisma.order.findUnique({ where: { id: params.orderId } });
    if (!order) throw new NotFoundError("Order not found");

    try {
      assertTransition(order.status as DomainStatus, params.nextStatus as DomainStatus, {
        override: params.override,
        actorRole: params.actorRole,
      });
    } catch (error) {
      throw new AppError(error instanceof Error ? error.message : "Invalid status transition", 422, "INVALID_TRANSITION");
    }

    if (params.nextStatus === "FAILED" && !params.reason) {
      throw new AppError("A failure reason is required", 422, "FAILURE_REASON_REQUIRED");
    }

    const updated = await prisma.order.update({
      where: { id: params.orderId },
      data: { status: params.nextStatus },
    });

    if (params.nextStatus === "FAILED") {
      const attemptCount = await prisma.deliveryAttempt.count({ where: { orderId: params.orderId } });
      await prisma.deliveryAttempt.create({
        data: {
          orderId: params.orderId,
          agentId: order.assignedAgentId,
          attemptNumber: attemptCount + 1,
          status: "FAILED",
          reason: params.reason,
          notes: params.note,
        },
      });
    }

    if (params.nextStatus === "DELIVERED") {
      const attemptCount = await prisma.deliveryAttempt.count({ where: { orderId: params.orderId } });
      await prisma.deliveryAttempt.create({
        data: {
          orderId: params.orderId,
          agentId: order.assignedAgentId,
          attemptNumber: attemptCount + 1,
          status: "SUCCESS",
          notes: params.note,
        },
      });
    }

    await this.appendHistory({
      orderId: params.orderId,
      status: params.nextStatus,
      actorId: params.actorId,
      note: params.note ?? (params.reason ? `Failed: ${params.reason}` : null),
      metadata: params.reason ? { reason: params.reason, override: Boolean(params.override) } : { override: Boolean(params.override) },
    });

    return updated;
  }
}

export const trackingService = new TrackingService();
