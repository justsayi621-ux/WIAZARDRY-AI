import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, subscriptionsTable, usersTable, notificationsTable } from "@workspace/db";
import { getUserId } from "../lib/auth";
import { TOKEN_PACKS, TOKENS_PER_ROUND } from "../lib/plans";

const router: IRouter = Router();

router.get("/subscriptions/plans", async (_req, res): Promise<void> => {
  res.json(TOKEN_PACKS);
});

router.get("/subscriptions/current", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  let [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  if (!sub) {
    [sub] = await db.insert(subscriptionsTable).values({ userId, planId: "free", tokenBalance: 5, tokensUsed: 0 }).returning();
  }
  res.json({
    ...sub,
    currentPeriodEnd: null,
    tokenBalance: sub.tokenBalance,
    tokenLimit: sub.tokenBalance,
    tokensRemaining: Math.max(0, sub.tokenBalance - sub.tokensUsed),
  });
});

router.post("/subscriptions/upgrade", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { planId } = req.body;
  const pack = TOKEN_PACKS.find((p) => p.id === planId);
  if (!pack) { res.status(400).json({ error: "Invalid token pack" }); return; }
  let [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  if (sub) {
    [sub] = await db.update(subscriptionsTable).set({
      tokenBalance: sql`token_balance + ${pack.tokenLimit}` as never,
      updatedAt: new Date(),
    }).where(eq(subscriptionsTable.userId, userId)).returning();
  } else {
    [sub] = await db.insert(subscriptionsTable).values({
      userId,
      planId: "free",
      tokenBalance: pack.tokenLimit + 5,
      tokensUsed: 0,
      status: "active",
    }).returning();
  }

  // Success notification
  await db.insert(notificationsTable).values({
    userId,
    type: "subscription_upgrade",
    title: `Purchased ${pack.name}!`,
    message: `Your ${pack.name} is active. ${pack.tokenLimit.toLocaleString()} tokens were added to your wallet.`,
    priority: "medium",
  });

  res.json({
    ...sub,
    currentPeriodEnd: null,
    tokenBalance: sub.tokenBalance,
    tokenLimit: sub.tokenBalance,
    tokensRemaining: Math.max(0, sub.tokenBalance - sub.tokensUsed),
    message: `Successfully purchased ${pack.name}! ${pack.tokenLimit.toLocaleString()} tokens were added.`,
    plan: pack,
  });
});

router.get("/subscriptions/tokens", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  let [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  if (!sub) {
    [sub] = await db.insert(subscriptionsTable).values({ userId, planId: "free", tokenBalance: 5, tokensUsed: 0 }).returning();
  }
  const tokenLimit = sub.tokenBalance;
  const tokensUsed = sub.tokensUsed;
  const tokensRemaining = Math.max(0, tokenLimit - tokensUsed);
  const isExhausted = tokensRemaining <= 0;
  const warningThreshold = Math.max(5, Math.floor(tokenLimit * 0.2));
  const isNearLimit = !isExhausted && tokensRemaining <= warningThreshold;
  const resetAt = null;
  res.json({ userId, planId: sub.planId, tokenLimit, tokensUsed, tokensRemaining, resetAt, warningThreshold, isExhausted, isNearLimit });
});

router.post("/subscriptions/tokens/consume", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { amount } = req.body;
  const tokens = parseInt(amount ?? TOKENS_PER_ROUND, 10);
  let [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  if (!sub) { [sub] = await db.insert(subscriptionsTable).values({ userId, planId: "free", tokenBalance: 5, tokensUsed: 0 }).returning(); }
  const tokenLimit = sub.tokenBalance;
  if (sub.tokensUsed + tokens > tokenLimit) {
    res.status(402).json({ error: "Token limit exceeded. Upgrade your plan to continue." }); return;
  }
  [sub] = await db.update(subscriptionsTable).set({ tokensUsed: sub.tokensUsed + tokens }).where(eq(subscriptionsTable.userId, userId)).returning();
  const tokensRemaining = Math.max(0, tokenLimit - sub.tokensUsed);
  const isExhausted = sub.tokensUsed >= tokenLimit;
  const warningThreshold = Math.max(5, Math.floor(tokenLimit * 0.2));
  const isNearLimit = !isExhausted && tokensRemaining <= warningThreshold;
  res.json({ userId, planId: sub.planId, tokenLimit, tokensUsed: sub.tokensUsed, tokensRemaining, resetAt: sub.currentPeriodEnd?.toISOString() ?? null, warningThreshold, isExhausted, isNearLimit });
});

export default router;
