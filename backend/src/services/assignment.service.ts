import { prisma } from "../config/prisma.js";
import { logger } from "../config/logger.js";
import { AppError, NotFoundError } from "../utils/errors.js";
import { loadEnv } from "../config/env.js";
import { selectNearestAgent, type AssignableAgent, type AssignmentResult } from "../lib/assignment.js";
import { trackingService } from "./tracking.service.js";

const ACTIVE_ASSIGNED_STATUSES = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "RESCHEDULED"] as const;

export class AssignmentService {
  async listEligibleAgents(): Promise<AssignableAgent[]> {
    const agents = await prisma.agentProfile.findMany({
      include: {
        user: { select: { name: true } },
        assignedOrders: {
          where: { status: { in: [...ACTIVE_ASSIGNED_STATUSES] } },
          select: { id: true },
        },
      },
    });

    return agents.map((agent) => ({
      id: agent.id,
      userId: agent.userId,
      name: agent.user.name,
      status: agent.status,
      isAvailable: agent.isAvailable,
      currentLatitude: agent.currentLatitude,
      currentLongitude: agent.currentLongitude,
      currentZoneId: agent.currentZoneId,
      locationUpdatedAt: agent.locationUpdatedAt,
      activeOrderCount: agent.assignedOrders.length,
      maxActiveOrders: agent.maxActiveOrders,
    }));
  }

  async assignNearestAgent(orderId: string, actorId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order not found");
    if (!["CREATED", "RESCHEDULED", "ASSIGNED"].includes(order.status)) {
      throw new AppError(`Cannot auto-assign an order in status ${order.status}`, 422, "INVALID_STATUS");
    }

    const agents = await this.listEligibleAgents();
    const env = loadEnv();
    const result = selectNearestAgent(
      agents,
      {
        latitude: order.pickupLatitude,
        longitude: order.pickupLongitude,
        zoneId: order.pickupZoneId,
      },
      { staleThresholdMs: env.LOCATION_STALE_THRESHOLD },
    );

    if (!result) {
      throw new AppError("No available agent found for auto-assignment", 422, "NO_AVAILABLE_AGENT");
    }

    await this.applyAssignment(orderId, result, actorId, true);
    return result;
  }

  async assignManually(orderId: string, agentId: string, actorId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order not found");
    if (!["CREATED", "RESCHEDULED", "ASSIGNED"].includes(order.status)) {
      throw new AppError(`Cannot assign an order in status ${order.status}`, 422, "INVALID_STATUS");
    }

    const agents = await this.listEligibleAgents();
    const agent = agents.find((item) => item.id === agentId);
    if (!agent) throw new NotFoundError("Agent not found");
    if (!agent.isAvailable || agent.status !== "AVAILABLE") {
      throw new AppError("Selected agent is not available", 422, "AGENT_UNAVAILABLE");
    }
    if (agent.activeOrderCount >= agent.maxActiveOrders) {
      throw new AppError("Selected agent is at maximum active order capacity", 422, "AGENT_OVERLOADED");
    }

    const result: AssignmentResult = {
      agent,
      distanceKm: null,
      reason: "ANY_AVAILABLE_FALLBACK",
      locationFresh: false,
    };
    await this.applyAssignment(orderId, result, actorId, false);
    return result;
  }

  async unassign(orderId: string, actorId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order not found");
    if (order.status !== "ASSIGNED" && order.status !== "CREATED") {
      throw new AppError("Order can only be unassigned before pickup", 422, "INVALID_STATUS");
    }

    const previousAgentId = order.assignedAgentId;
    await prisma.order.update({
      where: { id: orderId },
      data: { assignedAgentId: null, status: "CREATED" },
    });

    if (previousAgentId) {
      await this.refreshAgentAvailability(previousAgentId);
    }

    await trackingService.appendHistory({
      orderId,
      status: "CREATED",
      actorId,
      note: "Agent unassigned by admin",
      metadata: { previousAgentId },
    });
  }

  private async applyAssignment(
    orderId: string,
    result: AssignmentResult,
    actorId: string,
    auto: boolean,
  ) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundError("Order not found");

    const previousAgentId = order.assignedAgentId;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        assignedAgentId: result.agent.id,
        status: "ASSIGNED",
      },
    });

    await prisma.agentProfile.update({
      where: { id: result.agent.id },
      data: { status: "BUSY", isAvailable: false },
    });

    if (previousAgentId && previousAgentId !== result.agent.id) {
      await this.refreshAgentAvailability(previousAgentId);
    }

    await trackingService.appendHistory({
      orderId,
      status: "ASSIGNED",
      actorId,
      note: auto
        ? `Auto-assigned to ${result.agent.name} (${result.reason}${result.distanceKm != null ? `, ${result.distanceKm} km` : ""}${result.locationFresh ? ", fresh location" : ""})`
        : `Manually assigned to ${result.agent.name}`,
      metadata: {
        agentId: result.agent.id,
        reason: result.reason,
        distanceKm: result.distanceKm,
        locationFresh: result.locationFresh,
        auto,
      },
    });

    logger.info(
      {
        orderId,
        agentId: result.agent.id,
        reason: result.reason,
        distanceKm: result.distanceKm,
        auto,
      },
      "agent assigned",
    );
  }

  async refreshAgentAvailability(agentId: string) {
    const activeCount = await prisma.order.count({
      where: {
        assignedAgentId: agentId,
        status: { in: [...ACTIVE_ASSIGNED_STATUSES] },
      },
    });

    const agent = await prisma.agentProfile.findUnique({ where: { id: agentId } });
    if (!agent || agent.status === "OFFLINE") return;

    if (activeCount === 0) {
      await prisma.agentProfile.update({
        where: { id: agentId },
        data: { status: "AVAILABLE", isAvailable: true },
      });
    }
  }
}

export const assignmentService = new AssignmentService();
