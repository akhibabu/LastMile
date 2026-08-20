import { prisma } from "../config/prisma.js";
import { ForbiddenError, NotFoundError } from "../utils/errors.js";

export class AgentService {
  list() {
    return prisma.agentProfile.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        currentZone: true,
        assignedOrders: {
          where: { status: { in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "RESCHEDULED"] } },
          select: { id: true, orderNumber: true, status: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  available() {
    return prisma.agentProfile.findMany({
      where: { isAvailable: true, status: "AVAILABLE" },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        currentZone: true,
      },
    });
  }

  async getByUserId(userId: string) {
    const agent = await prisma.agentProfile.findUnique({
      where: { userId },
      include: { user: true, currentZone: true },
    });
    if (!agent) throw new NotFoundError("Agent profile not found");
    return agent;
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

    return prisma.agentProfile.update({
      where: { id: agentId },
      data: {
        currentLatitude: data.latitude,
        currentLongitude: data.longitude,
        currentZoneId: data.zoneId ?? agent.currentZoneId,
        locationUpdatedAt: new Date(),
      },
      include: { user: { select: { id: true, name: true, email: true } }, currentZone: true },
    });
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
    return prisma.agentProfile.update({
      where: { id: agentId },
      data: {
        isAvailable: status === "AVAILABLE" ? data.isAvailable : false,
        status,
      },
      include: { user: { select: { id: true, name: true, email: true } }, currentZone: true },
    });
  }
}

export const agentService = new AgentService();
