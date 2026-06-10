import { Router, type IRouter } from "express";
import { eq, desc, sql } from "drizzle-orm";
import { db, scansTable, subscriptionsTable } from "@workspace/db";
import { getUserId } from "../lib/auth";

const router: IRouter = Router();

router.get("/stats/dashboard", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const scans = await db.select().from(scansTable).where(eq(scansTable.userId, userId));
  const totalScans = scans.length;
  const aiDetected = scans.filter((s) => s.verdict === "ai").length;
  const authentic = scans.filter((s) => s.verdict === "real").length;
  const uncertain = scans.filter((s) => s.verdict === "unknown").length;
  const mixed = scans.filter((s) => s.verdict === "mixed").length;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const scansToday = scans.filter((s) => s.createdAt >= today).length;
  const withScore = scans.filter((s) => s.confidenceScore != null);
  const avgConfidenceScore = withScore.length > 0 ? withScore.reduce((a, s) => a + (s.confidenceScore ?? 0), 0) / withScore.length : null;
  const engineCounts: Record<string, number> = {};
  scans.forEach((s) => { engineCounts[s.engineModel] = (engineCounts[s.engineModel] || 0) + 1; });
  const topEngine = Object.entries(engineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const detectionRate = totalScans > 0 ? (aiDetected / totalScans) * 100 : null;
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  const tokenLimit = sub?.tokenBalance ?? 0;
  const tokensUsed = sub?.tokensUsed ?? 0;
  const tokensRemaining = Math.max(0, tokenLimit - tokensUsed);
  res.json({ totalScans, aiDetected, authentic, uncertain, mixed, tokensUsed, tokensRemaining, scansToday, avgConfidenceScore, topEngine, detectionRate });
});

router.get("/stats/scorecard", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const scans = await db.select().from(scansTable).where(eq(scansTable.userId, userId)).orderBy(desc(scansTable.createdAt));
  const total = scans.length;
  const completed = scans.filter((s) => s.status === "complete");
  const accuracyScore = completed.length > 0 ? Math.min(100, 50 + completed.length * 2.5) : 0;
  const activityScore = Math.min(100, total * 5);
  const trustScore = Math.min(100, 40 + completed.filter((s) => s.confidenceScore && s.confidenceScore > 70).length * 3);
  const overallScore = Math.round((accuracyScore + activityScore + trustScore) / 3);
  const grade = overallScore >= 90 ? "A+" : overallScore >= 80 ? "A" : overallScore >= 70 ? "B" : overallScore >= 60 ? "C" : "D";
  const insights: string[] = [];
  if (total === 0) insights.push("Run your first scan to build your scorecard");
  if (scans.filter((s) => s.verdict === "ai").length > total * 0.5) insights.push("High AI detection rate — your content environment may be high-risk");
  if (activityScore > 60) insights.push("Active scanner — keep up the verification habits");
  if (trustScore > 70) insights.push("Strong confidence scores across your scans");
  const suggestions: string[] = [];
  if (total < 5) suggestions.push("Run at least 5 scans to unlock full scorecard metrics");
  if (scans[0] && new Date().getTime() - scans[0].createdAt.getTime() > 7 * 24 * 3600 * 1000) suggestions.push("You haven't scanned in over a week — stay vigilant");
  suggestions.push("Try the Deep Analysis engine for higher confidence scores");
  const lastActive = scans[0]?.createdAt?.toISOString() ?? null;
  // Streak: consecutive days with scans
  let streak = 0;
  const daySet = new Set(scans.map((s) => s.createdAt.toISOString().split("T")[0]));
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    if (daySet.has(d.toISOString().split("T")[0])) streak++;
    else break;
  }
  res.json({ userId, overallScore, trustScore, accuracyScore, activityScore, grade, insights, suggestions, streak, lastActive });
});

export default router;
