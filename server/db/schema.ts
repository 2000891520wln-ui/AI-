import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const inspirationImages = pgTable("inspiration_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().default("local-dev-user"),
  weekStart: text("week_start").notNull(),
  dayIndex: integer("day_index").notNull(),
  title: text("title").notNull(),
  imageDataUrl: text("image_data_url"),
  imageUrl: text("image_url"),
  storagePath: text("storage_path"),
  keywords: jsonb("keywords").$type<string[]>().notNull().default([]),
  reversePrompt: text("reverse_prompt").notNull().default(""),
  decoration: jsonb("decoration")
    .$type<{ tape: string; pin: string; rotate: number; clip: "tape" | "pin" | "clip" | "washi" }>()
    .notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export type InspirationImage = typeof inspirationImages.$inferSelect;
export type NewInspirationImage = typeof inspirationImages.$inferInsert;
