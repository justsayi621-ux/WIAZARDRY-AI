import { pgTable, text, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  // Core engine
  inferenceMode: text("inference_mode").notNull().default("hybrid"),
  scanSensitivity: text("scan_sensitivity").notNull().default("medium"),
  dataUsageMode: text("data_usage_mode").notNull().default("normal"),
  autoDeleteDays: integer("auto_delete_days"),
  localOnlyMode: boolean("local_only_mode").notNull().default(false),
  // Notifications
  pushNotifications: boolean("push_notifications").notNull().default(true),
  notificationBarResults: boolean("notification_bar_results").notNull().default(true),
  silentMode: boolean("silent_mode").notNull().default(false),
  priorityAlert: boolean("priority_alert").notNull().default(true),
  // Display
  darkMode: boolean("dark_mode").notNull().default(true),
  language: text("language").notNull().default("en"),
  timezone: text("timezone").notNull().default("UTC"),
  // Security
  twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
  sessionTimeout: integer("session_timeout").notNull().default(30),
  // Advanced tier settings
  batchScanEnabled: boolean("batch_scan_enabled").notNull().default(false),
  exportFormat: text("export_format").notNull().default("json"),
  customSensitivityThreshold: real("custom_sensitivity_threshold"),
  dataRetentionDays: integer("data_retention_days"),
  priorityQueueEnabled: boolean("priority_queue_enabled").notNull().default(false),
  // Enterprise tier settings
  webhookEnabled: boolean("webhook_enabled").notNull().default(false),
  webhookUrl: text("webhook_url"),
  apiRateLimitPerMinute: integer("api_rate_limit_per_minute").notNull().default(60),
  whitelabelEnabled: boolean("whitelabel_enabled").notNull().default(false),
  auditLogEnabled: boolean("audit_log_enabled").notNull().default(false),
  ipWhitelist: text("ip_whitelist"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true, updatedAt: true });
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
