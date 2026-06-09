import type { NextFunction, Request, Response } from "express";
import type { z } from "zod";

function validationError(res: Response, error: z.ZodError) {
  return res.status(400).json({
    error: "VALIDATION_ERROR",
    issues: error.issues.map((issue) => ({
      path: issue.path.join("."),
      message: issue.message,
    })),
  });
}

export function validateBody<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return validationError(res, result.error);
    }

    req.body = result.data;
    return next();
  };
}

export function validateParams<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return validationError(res, result.error);
    }

    req.params = result.data as Request["params"];
    return next();
  };
}

export function validateQuery<TSchema extends z.ZodTypeAny>(schema: TSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return validationError(res, result.error);
    }

    req.query = result.data as Request["query"];
    return next();
  };
}
