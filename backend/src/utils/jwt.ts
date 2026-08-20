import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { loadEnv } from "../config/env.js";

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
}

export function signToken(payload: TokenPayload): string {
  const env = loadEnv();
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function verifyToken(token: string): TokenPayload {
  const env = loadEnv();
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}
