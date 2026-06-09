import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { getDb } from "../db/client.js";
import { users } from "../db/schema.js";
import { validateBody } from "../http/validation.js";
import { authCookieName, getAuthCookieOptions } from "./cookies.js";
import { signSessionToken } from "./jwt.js";
import { requireAuth } from "./middleware.js";

const loginSchema = z.object({
  email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
  password: z.string().min(1).max(256),
});

const registerSchema = z.object({
  email: z.string().trim().email().max(320).transform((email) => email.toLowerCase()),
  password: z.string().min(8).max(256),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  dni: z.string().trim().min(1).max(30),
  phone: z.string().trim().max(80).optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: z.string().min(8).max(256),
});

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "TOO_MANY_LOGIN_ATTEMPTS" },
});

export const authRouter = Router();

authRouter.post("/register", loginRateLimit, validateBody(registerSchema), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, dni, phone } = req.body as z.infer<typeof registerSchema>;
    const passwordHash = await bcrypt.hash(password, 12);

    const [user] = await getDb()
      .insert(users)
      .values({
        email,
        passwordHash,
        firstName,
        lastName,
        dni,
        phone: phone || null,
        role: "USER",
        isActive: true,
      })
      .returning({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        dni: users.dni,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
      });

    res.cookie(authCookieName, signSessionToken(user), getAuthCookieOptions());
    return res.status(201).json({ user });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "23505") {
      return res.status(409).json({ error: "EMAIL_ALREADY_EXISTS" });
    }

    return next(error);
  }
});

authRouter.post("/login", loginRateLimit, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const [user] = await getDb()
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        firstName: users.firstName,
        lastName: users.lastName,
        dni: users.dni,
        phone: users.phone,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user?.isActive) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({ error: "INVALID_CREDENTIALS" });
    }

    const authUser = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      dni: user.dni,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
    };

    res.cookie(authCookieName, signSessionToken(authUser), getAuthCookieOptions());
    return res.json({ user: authUser });
  } catch (error) {
    return next(error);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(authCookieName, getAuthCookieOptions());
  return res.status(204).send();
});

authRouter.get("/me", requireAuth, (req, res) => {
  return res.json({ user: req.user });
});

authRouter.patch(
  "/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
      const [user] = await getDb()
        .select({
          id: users.id,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.id, req.user!.id))
        .limit(1);

      if (!user) {
        return res.status(401).json({ error: "UNAUTHENTICATED" });
      }

      const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);

      if (!passwordMatches) {
        return res.status(400).json({ error: "INVALID_CURRENT_PASSWORD" });
      }

      const passwordHash = await bcrypt.hash(newPassword, 12);

      await getDb()
        .update(users)
        .set({
          passwordHash,
          updatedAt: new Date(),
        })
        .where(eq(users.id, req.user!.id));

      return res.status(204).send();
    } catch (error) {
      return next(error);
    }
  },
);
