import type { userRole } from "../db/schema.js";

export type UserRole = (typeof userRole.enumValues)[number];

export interface AuthUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  dni: string | null;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
}
