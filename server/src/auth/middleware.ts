import type { NextFunction, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { users } from "../db/schema.js";
import { authCookieName } from "./cookies.js";
import { verifySessionToken } from "./jwt.js";
import type { UserRole } from "./types.js";

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[authCookieName];

  if (!token) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }

  try {
    const sessionUser = verifySessionToken(token);
    const [user] = await getDb()
      .select({
        id: users.id,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.id, sessionUser.id))
      .limit(1);

    if (!user?.isActive) {
      return res.status(401).json({ error: "UNAUTHENTICATED" });
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "UNAUTHENTICATED" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    return next();
  };
}
