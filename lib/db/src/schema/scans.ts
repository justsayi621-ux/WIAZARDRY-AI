import { pgTable, text, serial, integer, real, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scansTable = pgTable("scans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  filename: text("filename"),
  mediaUrl: text("media_url"),
  secondaryUrl: text("secondary_url"),
  mediaType: text("media_type"),
  contextNote: text("context_note"),
  engineModel: text("engine_model").notNull().default("gemini-2.5-flash"),
  status: text("status").notNull().default("pending"),
  verdict: text("verdict").notNull().default("unknown"),
  confidenceScore: real("confidence_score"),
  sensitivityLevel: text("sensitivity_level").notNull().default("medium"),
  anomalies: text("anomalies"),
  categories: text("categories"),
  summary: text("summary"),
  aiReasoning: text("ai_reasoning"),
  usedCombinedInput: boolean("used_combined_input").notNull().default(false),
  tokensUsed: integer("tokens_used").notNull().default(5),
  processingMs: integer("processing_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
});

export const insertScanSchema = createInsertSchema(scansTable).omit({ id: true, createdAt: true });
export type InsertScan = z.infer<typeof insertScanSchema>;
export type Scan = typeof scansTable.$inferSelect;
