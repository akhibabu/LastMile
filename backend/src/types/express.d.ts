import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      cookies?: Record<string, string>;
      user?: {
        id: string;
        email: string;
        role: Role;
        name: string;
      };
    }
  }
}

export {};
