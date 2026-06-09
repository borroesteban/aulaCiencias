import { z } from "zod";

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export const nullableTextSchema = z
  .string()
  .trim()
  .max(5000)
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value));

export const shortNullableTextSchema = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value));

export const urlSchema = z
  .string()
  .trim()
  .url()
  .max(2000)
  .optional()
  .nullable()
  .transform((value) => (value === "" ? null : value));

export const numericStringSchema = z
  .union([z.number(), z.string().trim()])
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    return String(value);
  });

export const booleanQuerySchema = z
  .enum(["true", "false"])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    return value === "true";
  });
