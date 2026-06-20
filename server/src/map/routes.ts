import { Router } from "express";
import { z } from "zod";
import { validateQuery } from "../http/validation.js";

export const mapRouter = Router();

const maxZoom = 19;
const geocodeQuerySchema = z.object({
  q: z.string().trim().min(3).max(240),
});

const gualeguaychuViewbox = "-58.75,-32.85,-58.25,-33.25";

mapRouter.get("/tiles/:z/:x/:y.png", async (req, res, next) => {
  try {
    const z = Number(req.params.z);
    const x = Number(req.params.x);
    const y = Number(req.params.y);
    const maxTile = 2 ** z;

    if (
      !Number.isInteger(z) ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      z < 0 ||
      z > maxZoom ||
      x < 0 ||
      y < 0 ||
      x >= maxTile ||
      y >= maxTile
    ) {
      return res.status(400).json({ error: "INVALID_TILE" });
    }

    const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
    const response = await fetch(tileUrl, {
      headers: {
        "User-Agent": "aulaCiencias local map proxy",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "TILE_UNAVAILABLE" });
    }

    const tile = Buffer.from(await response.arrayBuffer());

    res.setHeader("Content-Type", response.headers.get("content-type") || "image/png");
    res.setHeader("Cache-Control", "public, max-age=86400");

    return res.send(tile);
  } catch (error) {
    return next(error);
  }
});

mapRouter.get("/geocode", validateQuery(geocodeQuerySchema), async (req, res, next) => {
  try {
    const { q } = req.query as unknown as z.infer<typeof geocodeQuerySchema>;
    const params = new URLSearchParams({
      q,
      format: "jsonv2",
      limit: "1",
      countrycodes: "ar",
      viewbox: gualeguaychuViewbox,
      bounded: "1",
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        "User-Agent": "aulaCiencias local geocoder",
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "GEOCODE_UNAVAILABLE" });
    }

    const results = (await response.json()) as { lat?: string; lon?: string; display_name?: string }[];
    const first = results[0];

    if (!first?.lat || !first.lon) {
      return res.json({ item: null });
    }

    return res.json({
      item: {
        latitude: first.lat,
        longitude: first.lon,
        label: first.display_name || q,
      },
    });
  } catch (error) {
    return next(error);
  }
});
