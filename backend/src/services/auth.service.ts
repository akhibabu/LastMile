import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "../config/prisma.js";
import { ConflictError, UnauthorizedError } from "../utils/errors.js";
import { signToken } from "../utils/jwt.js";

const SALT_ROUNDS = 12;

type UserWithProfiles = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: Date;
  passwordHash?: string;
  customerProfile?: unknown;
  agentProfile?: unknown;
};

export class AuthService {
  async register(input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    address?: string;
    city?: string;
    pincode?: string;
  }) {
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictError("Email already registered");

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email,
        phone: input.phone,
        passwordHash,
        role: "CUSTOMER",
        customerProfile: {
          create: {
            address: input.address,
            city: input.city,
            pincode: input.pincode,
          },
        },
      },
      select: { id: true, name: true, email: true, phone: true, role: true, createdAt: true, customerProfile: true },
    });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    return { user, token };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { customerProfile: true, agentProfile: true },
    });
    if (!user) throw new UnauthorizedError("Invalid credentials");

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedError("Invalid credentials");

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    return {
      token,
      user: this.publicUser(user),
    };
  }

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { customerProfile: true, agentProfile: { include: { currentZone: true } } },
    });
    if (!user) throw new UnauthorizedError();
    return this.publicUser(user);
  }

  async createAgent(input: {
    name: string;
    email: string;
    phone?: string;
    password: string;
    currentZoneId?: string;
    currentLatitude?: number;
    currentLongitude?: number;
    isAvailable?: boolean;
  }) {
    const email = input.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictError("Email already registered");

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const available = input.isAvailable ?? true;
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email,
        phone: input.phone,
        passwordHash,
        role: "AGENT",
        agentProfile: {
          create: {
            status: available ? "AVAILABLE" : "OFFLINE",
            isAvailable: available,
            currentZoneId: input.currentZoneId,
            currentLatitude: input.currentLatitude,
            currentLongitude: input.currentLongitude,
            locationUpdatedAt: input.currentLatitude != null ? new Date() : null,
          },
        },
      },
      include: { agentProfile: true },
    });
    return this.publicUser(user);
  }

  publicUser(user: UserWithProfiles) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      createdAt: user.createdAt,
      customerProfile: user.customerProfile ?? null,
      agentProfile: user.agentProfile ?? null,
    };
  }
}

export const authService = new AuthService();
