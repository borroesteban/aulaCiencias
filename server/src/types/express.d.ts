import type { UserRole } from "../auth/types.js";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      firstName: string | null;
      lastName: string | null;
      dni: string | null;
      phone: string | null;
      role: UserRole;
      isActive: boolean;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
