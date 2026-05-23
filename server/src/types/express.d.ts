import type { UserRole } from "../auth/types.js";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      role: UserRole;
      isActive: boolean;
    }

    interface Request {
      user?: User;
    }
  }
}

export {};
