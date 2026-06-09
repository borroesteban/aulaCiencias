import {
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

export const bookingTimeSlots = pgTable("booking_time_slots", {
  id: idColumn(),
  startTime: time("start_time").notNull().unique(),
  label: text("label").notNull(),
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
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  mapUrl: text("map_url"),
  generalInfo: text("general_info"),
  isVisible: boolean("is_visible").notNull().default(true),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

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
  selectedDate: date("selected_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  totalTopics: integer("total_topics").notNull().default(0),
  totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentAlias: text("payment_alias"),
  adminNotes: text("admin_notes"),
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
  subjectWindowIntervalSeconds: integer("subject_window_interval_seconds").notNull().default(5),
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
