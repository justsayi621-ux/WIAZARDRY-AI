import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password"),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  tier: text("tier").notNull().default("free"),
  googleId: text("google_id").unique(),
  appleId: text("apple_id").unique(),
  authMethod: text("auth_method").notNull().default("email"),
  needsPasswordSetup: boolean("needs_password_setup").notNull().default(false),
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  twoFactorSecret: text("two_factor_secret"),
  sessionToken: text("session_token"),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  totalScans: integer("total_scans").notNull().default(0),
  aiDetected: integer("ai_detected").notNull().default(0),
  authentic: integer("authentic").notNull().default(0),
  uncertain: integer("uncertain").notNull().default(0),
  // New auth columns
  resetToken: text("reset_token"),
  resetTokenExpires: timestamp("reset_token_expires", { withTimezone: true }),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  onboardingAnswers: text("onboarding_answers"),
  emailVerified: boolean("email_verified").notNull().default(false),
  emailVerifyToken: text("email_verify_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;