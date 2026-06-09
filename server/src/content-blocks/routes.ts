import { asc, eq } from "drizzle-orm";
import { Router } from "express";
import { getDb } from "../db/client.js";
import { contentBlocks } from "../db/schema.js";

export const contentBlocksRouter = Router();

contentBlocksRouter.get("/", async (_req, res, next) => {
  try {
    const items = await getDb()
      .select({
        id: contentBlocks.id,
        key: contentBlocks.key,
        title: contentBlocks.title,
        eyebrow: contentBlocks.eyebrow,
        body: contentBlocks.body,
        imageUrl: contentBlocks.imageUrl,
        metadata: contentBlocks.metadata,
        displayOrder: contentBlocks.displayOrder,
      })
      .from(contentBlocks)
      .where(eq(contentBlocks.isVisible, true))
      .orderBy(asc(contentBlocks.displayOrder), asc(contentBlocks.key));

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
});
