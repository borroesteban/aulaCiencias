import type { userRole } from "../db/schema.js";

export type UserRole = (typeof userRole.enumValues)[number];

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
}
