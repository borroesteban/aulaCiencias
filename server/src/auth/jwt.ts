import jwt from "jsonwebtoken";
import { requireEnv } from "../config/env.js";
import type { AuthUser, UserRole } from "./types.js";

interface SessionPayload extends jwt.JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}

export function signSessionToken(user: AuthUser) {
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "7d") as jwt.SignOptions["expiresIn"];

  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    },
    requireEnv("JWT_SECRET"),
    {
      subject: user.id,
      expiresIn,
    },
  );
}

export function verifySessionToken(token: string): AuthUser {
  const payload = jwt.verify(token, requireEnv("JWT_SECRET")) as SessionPayload;

  if (!payload.sub || !payload.email || !payload.role) {
    throw new Error("Invalid session token");
  }

  return {
    id: payload.sub,
    email: payload.email,
    role: payload.role,
    isActive: payload.isActive,
  };
}
