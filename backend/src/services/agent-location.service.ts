import { prisma } from "../config/prisma.js";
import { NotFoundError } from "../utils/errors.js";
import { agentService } from "./agent.service.js";

export class AgentLocationService {
  async updateMyLocation(userId: string, data: { latitude: number; longitude: number }) {
    const agent = await prisma.agentProfile.findUnique({ where: { userId } });
    if (!agent) throw new NotFoundError("Agent profile not found");
    return agentService.updateLocation(agent.id, { id: userId, role: "AGENT" }, data);
  }
}

export const agentLocationService = new AgentLocationService();
