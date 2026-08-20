import { prisma } from "../config/prisma.js";
import { loadEnv } from "../config/env.js";
import { decorateAgentLocation } from "../lib/location-status.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";

function withLocation<T extends { currentLatitude?: number | null; currentLongitude?: number | null; locationUpdatedAt?: Date | null }>(
  agent: T,
) {
  return decorateAgentLocation(agent, loadEnv().LOCATION_STALE_THRESHOLD);
}

export class AgentService {
  async list() {
    const agents = await prisma.agentProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        currentZone: true,
        assignedOrders: {
          where: { status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "RESCHEDULED"] } },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            pickupAddress: true,
            pickupLatitude: true,
            pickupLongitude: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return agents.map((agent) => withLocation(agent));
  }

  async available() {
    const agents = await prisma.agentProfile.findMany({
      where: { isAvailable: true, status: "AVAILABLE" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        currentZone: true,
      },
    });
    return agents.map((agent) => withLocation(agent));
  }

  async getByUserId(userId: string) {
    const agent = await prisma.agentProfile.findUnique({
      where: { userId },
      include: { user: true, currentZone: true },
    });
    if (!agent) throw new NotFoundError("Agent profile not found");
    return withLocation(agent);
  }

  async updateLocation(
    agentId: string,
    actor: { id: string; role: string },
    data: { latitude: number; longitude: number; zoneId?: string },
  ) {
    const agent = await prisma.agentProfile.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundError("Agent not found");
    if (actor.role !== "ADMIN" && agent.userId !== actor.id) {
      throw new ForbiddenError();
    }

    await prisma.agentLocation.create({
      data: { agentId, latitude: data.latitude, longitude: data.longitude },
    });

    const updated = await prisma.agentProfile.update({
      where: { id: agentId },
      data: {
        currentLatitude: data.latitude,
        currentLongitude: data.longitude,
        currentZoneId: data.zoneId ?? agent.currentZoneId,
        locationUpdatedAt: new Date(),
      },
      include: { user: { select: { id: true, name: true, email: true } }, currentZone: true },
    });
    return withLocation(updated);
  }

  async updateAvailability(
    agentId: string,
    actor: { id: string; role: string },
    data: { isAvailable: boolean; status?: "AVAILABLE" | "BUSY" | "OFFLINE" },
  ) {
    const agent = await prisma.agentProfile.findUnique({ where: { id: agentId } });
    if (!agent) throw new NotFoundError("Agent not found");
    if (actor.role !== "ADMIN" && agent.userId !== actor.id) {
      throw new ForbiddenError();
    }

    const status = data.status ?? (data.isAvailable ? "AVAILABLE" : "OFFLINE");
    const updated = await prisma.agentProfile.update({
      where: { id: agentId },
      data: {
        isAvailable: status === "AVAILABLE" ? data.isAvailable : false,
        status,
      },
      include: { user: { select: { id: true, name: true, email: true } }, currentZone: true },
    });
    return withLocation(updated);
  }
}

export const agentService = new AgentService();
