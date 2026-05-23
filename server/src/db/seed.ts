import "dotenv/config";
import bcrypt from "bcryptjs";
import { requireEnv } from "../config/env.js";
import { closeDb, getDb } from "./client.js";
import { appSettings, users } from "./schema.js";

async function seed() {
  const db = getDb();
  const email = process.env.SUPERADMIN_EMAIL ?? "admin@aulaciencias.local";
  const password = requireEnv("SUPERADMIN_PASSWORD");
  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .insert(users)
    .values({
      email,
      passwordHash,
      role: "SUPERADMIN",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        passwordHash,
        role: "SUPERADMIN",
        isActive: true,
        updatedAt: new Date(),
      },
    });

  const existingSettings = await db.select({ id: appSettings.id }).from(appSettings).limit(1);

  if (existingSettings.length === 0) {
    await db.insert(appSettings).values({
      pricePerHour: "0",
      topicsPerHour: 1,
      maxStudentsPerSlot: 1,
      mercadoPagoAlias: null,
      primaryColor: "#0f766e",
      secondaryColor: "#1e293b",
      accentColor: "#f59e0b",
      whatsappNumber: null,
      siteTitle: "aulaCiencias",
    });
  }

  console.log(`Seed completed for SUPERADMIN ${email}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
