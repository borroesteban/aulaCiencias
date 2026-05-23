import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { adminRouter } from "./admin/routes.js";
import { authRouter } from "./auth/routes.js";
import { errorHandler } from "./http/error-handler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  app.use(express.json());
  app.use(cookieParser());

  if (process.env.NODE_ENV !== "production") {
    app.use(
      cors({
        origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
        credentials: true,
      }),
    );
  }

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/admin", adminRouter);
  app.use(errorHandler);

  if (process.env.NODE_ENV === "production") {
    const clientDistPath = path.resolve(__dirname, "../../client/dist");

    app.use(express.static(clientDistPath));

    app.get("*", (_req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  }

  return app;
}
