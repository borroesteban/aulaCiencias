import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

export function validateBody<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        issues: result.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    req.body = result.data;
    return next();
  };
}
