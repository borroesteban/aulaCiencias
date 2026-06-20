import {
  type AnyPgColumn,
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["SUPERADMIN", "ADMIN", "USER"]);

export const bookingStatus = pgEnum("booking_status", [
  "PENDING_PAYMENT",
  "PAID",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
]);

const idColumn = () => uuid("id").primaryKey().defaultRandom();
const createdAtColumn = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAtColumn = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: idColumn(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  dni: text("dni"),
  phone: text("phone"),
  role: userRole("role").notNull().default("ADMIN"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const downloadableCategories = pgTable("downloadable_categories", {
  id: idColumn(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const downloadableContents = pgTable("downloadable_contents", {
  id: idColumn(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => downloadableCategories.id, { onDelete: "restrict" }),
  isFeatured: boolean("is_featured").notNull().default(false),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const subjects = pgTable("subjects", {
  id: idColumn(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  displayOrder: integer("display_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const topics = pgTable("topics", {
  id: idColumn(),
  title: text("title").notNull(),
  introduction: text("introduction"),
  importance: text("importance"),
  subject: text("subject"),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  educationLevel: text("education_level"),
  educationTrack: text("education_track"),
  schoolYear: text("school_year"),
  relatedCareers: text("related_careers"),
  estimatedMinutes: integer("estimated_minutes").notNull().default(60),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const subjectHighlights = pgTable("subject_highlights", {
  id: idColumn(),
  subjectId: uuid("subject_id").references(() => subjects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  keywords: text("keywords"),
  definition: text("definition").notNull(),
  professions: text("professions"),
  jobs: text("jobs"),
  imageUrl: text("image_url").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const glossaryTopics = pgTable("glossary_topics", {
  id: idColumn(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  shortDescription: text("short_description"),
  icon: text("icon"),
  imageUrl: text("image_url"),
  themeColor: text("theme_color"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const glossaryArticles = pgTable("glossary_articles", {
  id: idColumn(),
  topicId: uuid("topic_id")
    .notNull()
    .references(() => glossaryTopics.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  summary: text("summary"),
  fullDefinition: text("full_definition"),
  introduction: text("introduction"),
  body: text("body"),
  examples: text("examples"),
  counterExamples: text("counter_examples"),
  commonMistakes: text("common_mistakes"),
  applications: text("applications"),
  relatedConcepts: text("related_concepts"),
  conclusion: text("conclusion"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  keywords: text("keywords"),
  ogImageUrl: text("og_image_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const glossaryArticleLevels = pgTable("glossary_article_levels", {
  id: idColumn(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => glossaryArticles.id, { onDelete: "cascade" }),
  levelName: text("level_name").notNull(),
  levelOrder: integer("level_order").notNull().default(0),
  content: text("content").notNull(),
  examples: text("examples"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const glossaryArticleMedia = pgTable("glossary_article_media", {
  id: idColumn(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => glossaryArticles.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title"),
  description: text("description"),
  url: text("url"),
  altText: text("alt_text"),
  dataJson: jsonb("data_json").$type<Record<string, unknown> | null>(),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const glossaryArticleSources = pgTable("glossary_article_sources", {
  id: idColumn(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => glossaryArticles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  author: text("author"),
  institution: text("institution"),
  url: text("url"),
  sourceType: text("source_type"),
  accessDate: date("access_date"),
  displayOrder: integer("display_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const glossaryArticleRelatedTopics = pgTable("glossary_article_related_topics", {
  id: idColumn(),
  articleId: uuid("article_id")
    .notNull()
    .references(() => glossaryArticles.id, { onDelete: "cascade" }),
  relatedArticleId: uuid("related_article_id")
    .notNull()
    .references(() => glossaryArticles.id, { onDelete: "cascade" }),
  relationLabel: text("relation_label"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const bookingTimeSlots = pgTable("booking_time_slots", {
  id: idColumn(),
  startTime: time("start_time").notNull().unique(),
  label: text("label").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const bookingFilterOptions = pgTable("booking_filter_options", {
  id: idColumn(),
  kind: text("kind").notNull(),
  label: text("label").notNull(),
  parentId: uuid("parent_id").references((): AnyPgColumn => bookingFilterOptions.id, { onDelete: "set null" }),
  displayOrder: integer("display_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const schools = pgTable("schools", {
  id: idColumn(),
  name: text("name").notNull(),
  level: text("level"),
  managementType: text("management_type"),
  address: text("address"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  lastVerifiedAt: date("last_verified_at"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  mapUrl: text("map_url"),
  generalInfo: text("general_info"),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const institutions = pgTable("institutions", {
  id: idColumn(),
  name: text("name").notNull(),
  type: text("type").notNull().default("otro"),
  description: text("description"),
  address: text("address"),
  city: text("city").notNull().default("Gualeguaychú"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  lastVerifiedAt: date("last_verified_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const academicPrograms = pgTable("academic_programs", {
  id: idColumn(),
  institutionId: uuid("institution_id")
    .notNull()
    .references(() => institutions.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  academicLevel: text("academic_level").notNull(),
  titleGranted: text("title_granted"),
  duration: text("duration"),
  modality: text("modality"),
  description: text("description"),
  requirements: text("requirements"),
  website: text("website"),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  lastVerifiedAt: date("last_verified_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const programTopics = pgTable("program_topics", {
  id: idColumn(),
  programId: uuid("program_id")
    .notNull()
    .references(() => academicPrograms.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  normalizedName: text("normalized_name").notNull(),
  yearOrStage: text("year_or_stage"),
  isRequired: boolean("is_required").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const studyAreas = pgTable("study_areas", {
  id: idColumn(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const programStudyAreas = pgTable(
  "program_study_areas",
  {
    programId: uuid("program_id")
      .notNull()
      .references(() => academicPrograms.id, { onDelete: "cascade" }),
    studyAreaId: uuid("study_area_id")
      .notNull()
      .references(() => studyAreas.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.programId, table.studyAreaId] }),
  }),
);

export const guardians = pgTable("guardians", {
  id: idColumn(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name"),
  dni: text("dni").unique(),
  phone: text("phone"),
  email: text("email"),
  relationship: text("relationship"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const students = pgTable("students", {
  id: idColumn(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dni: text("dni").notNull().unique(),
  phone: text("phone"),
  address: text("address").notNull(),
  responsibleName: text("responsible_name").notNull(),
  responsibleContact: text("responsible_contact").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const studentGuardians = pgTable(
  "student_guardians",
  {
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    guardianId: uuid("guardian_id")
      .notNull()
      .references(() => guardians.id, { onDelete: "cascade" }),
    relationship: text("relationship"),
    isPrimary: boolean("is_primary").notNull().default(false),
    isAuthorized: boolean("is_authorized").notNull().default(true),
    createdAt: createdAtColumn(),
    updatedAt: updatedAtColumn(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.studentId, table.guardianId] }),
  }),
);

export const bookings = pgTable("bookings", {
  id: idColumn(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "restrict" }),
  status: bookingStatus("status").notNull().default("PENDING_PAYMENT"),
  bookingBatchId: uuid("booking_batch_id"),
  estadoReserva: text("estado_reserva").notNull().default("pendiente_pago"),
  estadoPago: text("estado_pago").notNull().default("pendiente"),
  selectedDate: date("selected_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  totalTopics: integer("total_topics").notNull().default(0),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentAlias: text("payment_alias"),
  mercadopagoPreferenceId: text("mercadopago_preference_id"),
  mercadopagoPaymentId: text("mercadopago_payment_id"),
  googleCalendarEventId: text("google_calendar_event_id"),
  montoSenia: numeric("monto_senia", { precision: 12, scale: 2 }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  adminNotes: text("admin_notes"),
  objetivos: jsonb("objetivos").$type<string[]>().notNull().default([]),
  modalidad: text("modalidad").notNull().default("virtual"),
  tipoClase: text("tipo_clase").notNull().default("privada"),
  usaPackPromocional: boolean("usa_pack_promocional").notNull().default(false),
  packSeleccionado: text("pack_seleccionado"),
  horariosSeleccionados: jsonb("horarios_seleccionados")
    .$type<Array<{ selectedDate: string; startTime: string; endTime: string; packId?: string | null }>>()
    .notNull()
    .default([]),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const bookingTopics = pgTable(
  "booking_topics",
  {
    bookingId: uuid("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => topics.id, { onDelete: "restrict" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.bookingId, table.topicId] }),
  }),
);

export const studentSubjectProgress = pgTable("student_subject_progress", {
  id: idColumn(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  progressPercent: integer("progress_percent").notNull().default(0),
  status: text("status"),
  teacherNotes: text("teacher_notes"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const studentSeenTopics = pgTable("student_seen_topics", {
  id: idColumn(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  topic: text("topic").notNull(),
  seenAt: timestamp("seen_at", { withTimezone: true }).notNull().defaultNow(),
  bookingId: uuid("booking_id").references(() => bookings.id, { onDelete: "set null" }),
});

export const studentPendingExercises = pgTable("student_pending_exercises", {
  id: idColumn(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  subject: text("subject").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  status: text("status").notNull().default("pendiente"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const studentTeacherNotes = pgTable("student_teacher_notes", {
  id: idColumn(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  subject: text("subject"),
  note: text("note").notNull(),
  visibleToFamily: boolean("visible_to_family").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const studentDownloadEvents = pgTable("student_download_events", {
  id: idColumn(),
  studentId: uuid("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  downloadableId: uuid("downloadable_id").references(() => downloadableContents.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  downloadedAt: timestamp("downloaded_at", { withTimezone: true }).notNull().defaultNow(),
});

export const studentFamilySummaries = pgTable("student_family_summaries", {
  id: idColumn(),
  studentId: uuid("student_id")
    .notNull()
    .unique()
    .references(() => students.id, { onDelete: "cascade" }),
  currentWork: text("current_work"),
  needsReinforcement: text("needs_reinforcement"),
  generalStatus: text("general_status"),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const bookingPayments = pgTable("booking_payments", {
  id: idColumn(),
  bookingBatchId: uuid("booking_batch_id").notNull(),
  status: text("status").notNull().default("pending"),
  provider: text("provider").notNull().default("mercadopago"),
  preferenceId: text("preference_id"),
  paymentId: text("payment_id"),
  externalReference: text("external_reference"),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  rawPayload: jsonb("raw_payload").$type<Record<string, unknown> | null>(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export const appSettings = pgTable("app_settings", {
  id: idColumn(),
  pricePerHour: numeric("price_per_hour", { precision: 12, scale: 2 }).notNull().default("0"),
  topicsPerHour: integer("topics_per_hour").notNull().default(1),
  maxStudentsPerSlot: integer("max_students_per_slot").notNull().default(1),
  mercadoPagoAlias: text("mercado_pago_alias"),
  primaryColor: text("primary_color").notNull().default("#000000"),
  secondaryColor: text("secondary_color").notNull().default("#000000"),
  accentColor: text("accent_color").notNull().default("#000000"),
  heroImageUrl: text("hero_image_url"),
  backgroundImageUrl: text("background_image_url"),
  faviconUrl: text("favicon_url"),
  carouselImages: text("carousel_images"),
  educationalBackgroundImages: text("educational_background_images"),
  subjectWindowIntervalSeconds: integer("subject_window_interval_seconds").notNull().default(3),
  subjectWindowRotationSeconds: numeric("subject_window_rotation_seconds", { precision: 4, scale: 1 }).notNull().default("1.0"),
  subjectWindowPauseSeconds: numeric("subject_window_pause_seconds", { precision: 4, scale: 1 }).notNull().default("2.0"),
  subjectWindowSizeValue: numeric("subject_window_size_value", { precision: 6, scale: 2 }).notNull().default("140"),
  subjectWindowSizeUnit: text("subject_window_size_unit").notNull().default("px"),
  subjectWindowItems: text("subject_window_items"),
  whatsappNumber: text("whatsapp_number"),
  siteTitle: text("site_title").notNull().default(""),
  heroEyebrow: text("hero_eyebrow").notNull().default(""),
  heroTitle: text("hero_title").notNull().default(""),
  heroSubtitle: text("hero_subtitle").notNull().default(""),
  updatedAt: updatedAtColumn(),
});

export const contentBlocks = pgTable("content_blocks", {
  id: idColumn(),
  key: text("key").notNull().unique(),
  title: text("title"),
  eyebrow: text("eyebrow"),
  body: text("body"),
  imageUrl: text("image_url"),
  metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
  displayOrder: integer("display_order").notNull().default(0),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;
export type NewAppSettings = typeof appSettings.$inferInsert;
