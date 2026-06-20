import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { getDb } from "../db/client.js";
import { idParamsSchema, nullableTextSchema, shortNullableTextSchema } from "../http/schemas.js";
import { validateBody, validateParams } from "../http/validation.js";
import {
  addPendingExercise,
  addSeenTopic,
  addSubjectProgress,
  addTeacherNote,
  getStudentDashboard,
  getStudentFamilySummary,
  registerDownloadEvent,
  upsertFamilySummary,
} from "./service.js";

const progressSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  progressPercent: z.coerce.number().int().min(0).max(100),
  status: shortNullableTextSchema,
  teacherNotes: nullableTextSchema,
});

const seenTopicSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  topic: z.string().trim().min(1).max(240),
  bookingId: z.string().uuid().optional().nullable(),
});

const pendingExerciseSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(240),
  description: nullableTextSchema,
  dueDate: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform((value) => (value ? new Date(value) : null)),
  status: shortNullableTextSchema,
});

const teacherNoteSchema = z.object({
  subject: shortNullableTextSchema,
  note: z.string().trim().min(1).max(5000),
  visibleToFamily: z.boolean().optional(),
});

const familySummarySchema = z.object({
  currentWork: nullableTextSchema,
  needsReinforcement: nullableTextSchema,
  generalStatus: nullableTextSchema,
});

const downloadEventSchema = z.object({
  downloadableId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(1).max(240),
});

export const studentsRouter = Router();
const adminOnly = [requireAuth, requireRole(["SUPERADMIN", "ADMIN"])] as const;

studentsRouter.get("/:id/dashboard", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const dashboard = await getStudentDashboard(db, req.params.id);
    return res.json(dashboard);
  } catch (error) {
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      return res.status(404).json({ error: "STUDENT_NOT_FOUND" });
    }

    return next(error);
  }
});

studentsRouter.get("/:id/family-summary", validateParams(idParamsSchema), async (req, res, next) => {
  try {
    const db = getDb();
    const summary = await getStudentFamilySummary(db, req.params.id);
    return res.json(summary);
  } catch (error) {
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      return res.status(404).json({ error: "STUDENT_NOT_FOUND" });
    }

    return next(error);
  }
});

studentsRouter.post("/:id/progress", ...adminOnly, validateParams(idParamsSchema), validateBody(progressSchema), async (req, res, next) => {
  try {
    const created = await addSubjectProgress(getDb(), req.params.id, req.body);
    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      return res.status(404).json({ error: "STUDENT_NOT_FOUND" });
    }

    return next(error);
  }
});

studentsRouter.post("/:id/seen-topics", ...adminOnly, validateParams(idParamsSchema), validateBody(seenTopicSchema), async (req, res, next) => {
  try {
    const created = await addSeenTopic(getDb(), req.params.id, req.body);
    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      return res.status(404).json({ error: "STUDENT_NOT_FOUND" });
    }

    return next(error);
  }
});

studentsRouter.post(
  "/:id/pending-exercises",
  ...adminOnly,
  validateParams(idParamsSchema),
  validateBody(pendingExerciseSchema),
  async (req, res, next) => {
    try {
      const created = await addPendingExercise(getDb(), req.params.id, req.body);
      return res.status(201).json(created);
    } catch (error) {
      if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
        return res.status(404).json({ error: "STUDENT_NOT_FOUND" });
      }

      return next(error);
    }
  },
);

studentsRouter.post("/:id/teacher-notes", ...adminOnly, validateParams(idParamsSchema), validateBody(teacherNoteSchema), async (req, res, next) => {
  try {
    const created = await addTeacherNote(getDb(), req.params.id, req.body);
    return res.status(201).json(created);
  } catch (error) {
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      return res.status(404).json({ error: "STUDENT_NOT_FOUND" });
    }

    return next(error);
  }
});

studentsRouter.post("/:id/family-summary", ...adminOnly, validateParams(idParamsSchema), validateBody(familySummarySchema), async (req, res, next) => {
  try {
    const summary = await upsertFamilySummary(getDb(), req.params.id, req.body);
    return res.status(201).json(summary);
  } catch (error) {
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      return res.status(404).json({ error: "STUDENT_NOT_FOUND" });
    }

    return next(error);
  }
});

studentsRouter.post("/:id/download-events", ...adminOnly, validateParams(idParamsSchema), validateBody(downloadEventSchema), async (req, res, next) => {
  try {
    const event = await registerDownloadEvent(getDb(), req.params.id, req.body);
    return res.status(201).json(event);
  } catch (error) {
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      return res.status(404).json({ error: "STUDENT_NOT_FOUND" });
    }

    return next(error);
  }
});
