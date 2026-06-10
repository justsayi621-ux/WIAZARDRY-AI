import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, notificationsTable } from "@workspace/db";
import { getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const notes = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, userId)).orderBy(desc(notificationsTable.createdAt)).limit(50);
  res.json(notes);
});

router.patch("/notifications/read-all", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.userId, userId));
  res.json({ success: true, message: "All notifications marked as read" });
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [note] = await db.update(notificationsTable).set({ read: true }).where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, userId))).returning();
  if (!note) { res.status(404).json({ error: "Notification not found" }); return; }
  res.json(note);
});

export default router;
