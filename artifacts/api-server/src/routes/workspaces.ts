import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "@workspace/db";
import { getUserId } from "../lib/auth";
import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

// Workspace tables defined inline (until schema is migrated)
export const workspacesTable = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerId: integer("owner_id").notNull(),
  planId: text("plan_id").notNull().default("free"),
  scanQuota: integer("scan_quota").notNull().default(5),
  scansUsed: integer("scans_used").notNull().default(0),
  avatarUrl: text("avatar_url"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const workspaceMembersTable = pgTable("workspace_members", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  userId: integer("user_id").notNull(),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
});

const QUOTA_BY_PLAN: Record<string, number> = {
  free: 5, basic: 50, pro: 200, advanced: 600, enterprise: 1000,
};

const router: IRouter = Router();

// GET /workspaces — list user's workspaces
router.get("/workspaces", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const memberships = await db.select().from(workspaceMembersTable)
      .where(eq(workspaceMembersTable.userId, userId));
    const workspaceIds = memberships.map((m) => m.workspaceId);
    if (workspaceIds.length === 0) { res.json([]); return; }
    const workspaces = await Promise.all(
      workspaceIds.map((id) => db.select().from(workspacesTable).where(eq(workspacesTable.id, id)).then(([w]) => w))
    );
    const result = workspaces.filter(Boolean).map((ws) => ({
      ...ws,
      role: memberships.find((m) => m.workspaceId === ws.id)?.role,
      isOwner: ws.ownerId === userId,
    }));
    res.json(result);
  } catch {
    res.json([]); // tables not yet created
  }
});

// POST /workspaces — create workspace
router.post("/workspaces", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, description, planId = "free" } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: "Workspace name is required" }); return; }

  // Check plan limit — free users get 1 workspace, paid get more
  const existing = await db.select().from(workspacesTable)
    .where(eq(workspacesTable.ownerId, userId));
  const limits: Record<string, number> = { free: 1, basic: 2, pro: 5, advanced: 10, enterprise: 999 };
  const limit = limits[planId] ?? 1;
  if (existing.length >= limit) {
    res.status(403).json({ error: `Your plan allows up to ${limit} workspace(s). Upgrade to create more.` }); return;
  }

  const [ws] = await db.insert(workspacesTable).values({
    name: name.trim(), ownerId: userId, planId,
    scanQuota: QUOTA_BY_PLAN[planId] ?? 5,
    description: description?.trim(),
  }).returning();

  await db.insert(workspaceMembersTable).values({
    workspaceId: ws.id, userId, role: "owner",
  });

  res.status(201).json(ws);
});

// PATCH /workspaces/:id — update workspace
router.patch("/workspaces/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id, 10);
  const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, id));
  if (!ws || ws.ownerId !== userId) { res.status(403).json({ error: "Not authorized to edit this workspace" }); return; }
  const { name, description, avatarUrl } = req.body;
  const [updated] = await db.update(workspacesTable).set({
    ...(name ? { name: name.trim() } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    updatedAt: new Date(),
  }).where(eq(workspacesTable.id, id)).returning();
  res.json(updated);
});

// DELETE /workspaces/:id
router.delete("/workspaces/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id, 10);
  const [ws] = await db.select().from(workspacesTable).where(eq(workspacesTable.id, id));
  if (!ws || ws.ownerId !== userId) { res.status(403).json({ error: "Not authorized" }); return; }
  await db.delete(workspaceMembersTable).where(eq(workspaceMembersTable.workspaceId, id));
  await db.delete(workspacesTable).where(eq(workspacesTable.id, id));
  res.sendStatus(204);
});

// GET /workspaces/:id/members
router.get("/workspaces/:id/members", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id, 10);
  const members = await db.select().from(workspaceMembersTable)
    .where(eq(workspaceMembersTable.workspaceId, id));
  res.json(members);
});

export default router;