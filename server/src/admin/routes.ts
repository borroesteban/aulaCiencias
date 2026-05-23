import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole(["SUPERADMIN", "ADMIN"]));

adminRouter.get("/health", (_req, res) => {
  res.json({ ok: true, area: "admin" });
});
