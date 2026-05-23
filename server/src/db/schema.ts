import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  time,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["SUPERADMIN", "ADMIN"]);

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

export const topics = pgTable("topics", {
  id: idColumn(),
  title: text("title").notNull(),
  introduction: text("introduction"),
  importance: text("importance"),
  subject: text("subject"),
  relatedCareers: text("related_careers"),
  estimatedMinutes: integer("estimated_minutes").notNull().default(60),
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

export const students = pgTable("students", {
  id: idColumn(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dni: text("dni").notNull().unique(),
  phone: text("phone"),
  address: text("address").notNull(),
  responsibleName: text("responsible_name").notNull(),
  responsibleContact: text("responsible_contact").notNull(),
  createdAt: createdAtColumn(),
  updatedAt: updatedAtColumn(),
});

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
  primaryColor: text("primary_color").notNull().default("#0f766e"),
  secondaryColor: text("secondary_color").notNull().default("#1e293b"),
  accentColor: text("accent_color").notNull().default("#f59e0b"),
  whatsappNumber: text("whatsapp_number"),
  siteTitle: text("site_title").notNull().default("aulaCiencias"),
  updatedAt: updatedAtColumn(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AppSettings = typeof appSettings.$inferSelect;
export type NewAppSettings = typeof appSettings.$inferInsert;
