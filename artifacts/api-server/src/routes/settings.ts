import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";
import { getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/settings", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  let [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId));
  if (!settings) {
    [settings] = await db.insert(settingsTable).values({ userId }).returning();
  }
  res.json(settings);
});

router.patch("/settings", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const allowed = ["inferenceMode","scanSensitivity","dataUsageMode","autoDeleteDays","localOnlyMode","pushNotifications","notificationBarResults","silentMode","priorityAlert","darkMode","language","timezone","twoFactorEnabled","sessionTimeout"];
  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in req.body) {
      // Map camelCase to snake_case for Drizzle
      const dbKey = key.replace(/([A-Z])/g, (m) => `_${m.toLowerCase()}`);
      update[dbKey] = req.body[key];
    }
  }
  if (Object.keys(update).length === 0) { res.status(400).json({ error: "No valid fields provided" }); return; }
  let [settings] = await db.select().from(settingsTable).where(eq(settingsTable.userId, userId));
  if (!settings) {
    [settings] = await db.insert(settingsTable).values({ userId }).returning();
  }
  [settings] = await db.update(settingsTable).set(req.body as Partial<typeof settingsTable.$inferInsert>).where(eq(settingsTable.userId, userId)).returning();
  res.json(settings);
});

export default router;
