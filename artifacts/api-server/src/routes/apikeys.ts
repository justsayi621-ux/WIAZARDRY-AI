import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, apiKeysTable, webhooksTable, usersTable } from "@workspace/db";
import { getUserId } from "../lib/auth";
import { generateApiKey, generateWebhookSecret } from "../lib/auth";

const router: IRouter = Router();

async function requireEnterprise(req: Parameters<typeof getUserId>[0], res: { status: (n: number) => { json: (d: unknown) => void } }): Promise<number | null> {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return null; }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (!user || user.tier !== "enterprise") { res.status(403).json({ error: "Enterprise tier required" }); return null; }
  return userId;
}

router.get("/api-keys", async (req, res): Promise<void> => {
  const userId = await requireEnterprise(req, res);
  if (!userId) return;
  const keys = await db.select().from(apiKeysTable).where(eq(apiKeysTable.userId, userId));
  res.json(keys.map((k) => ({ ...k, fullKey: null })));
});

router.post("/api-keys", async (req, res): Promise<void> => {
  const userId = await requireEnterprise(req, res);
  if (!userId) return;
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: "name is required" }); return; }
  const fullKey = generateApiKey();
  const keyPreview = `${fullKey.slice(0, 12)}...${fullKey.slice(-4)}`;
  const [key] = await db.insert(apiKeysTable).values({ userId, name, keyHash: fullKey, keyPreview, active: true }).returning();
  res.status(201).json({ ...key, fullKey });
});

router.delete("/api-keys/:id", async (req, res): Promise<void> => {
  const userId = await requireEnterprise(req, res);
  if (!userId) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(apiKeysTable).where(and(eq(apiKeysTable.id, id), eq(apiKeysTable.userId, userId)));
  res.sendStatus(204);
});

router.get("/webhooks", async (req, res): Promise<void> => {
  const userId = await requireEnterprise(req, res);
  if (!userId) return;
  const hooks = await db.select().from(webhooksTable).where(eq(webhooksTable.userId, userId));
  res.json(hooks.map((h) => ({ ...h, events: JSON.parse(h.events || "[]") })));
});

router.post("/webhooks", async (req, res): Promise<void> => {
  const userId = await requireEnterprise(req, res);
  if (!userId) return;
  const { url, events } = req.body;
  if (!url || !events) { res.status(400).json({ error: "url and events are required" }); return; }
  const secret = generateWebhookSecret();
  const [hook] = await db.insert(webhooksTable).values({ userId, url, events: JSON.stringify(events), secret }).returning();
  res.status(201).json({ ...hook, events: JSON.parse(hook.events || "[]") });
});

router.delete("/webhooks/:id", async (req, res): Promise<void> => {
  const userId = await requireEnterprise(req, res);
  if (!userId) return;
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(webhooksTable).where(and(eq(webhooksTable.id, id), eq(webhooksTable.userId, userId)));
  res.sendStatus(204);
});

export default router;
