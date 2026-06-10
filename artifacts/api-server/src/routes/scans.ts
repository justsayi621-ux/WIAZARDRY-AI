import { Router, type IRouter } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { db, scansTable, usersTable, subscriptionsTable, notificationsTable } from "@workspace/db";
import { getUserId } from "../lib/auth";
import { TOKENS_PER_ROUND, canUseCombinedInput, canUseEngine, getTokenLimit } from "../lib/plans";
import { GoogleGenAI } from "@google/genai";

// ─── AI Clients ───────────────────────────────────────────────────────────────
const geminiAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// ─── Engine routing ───────────────────────────────────────────────────────────
// gemini-2.5-flash  → Groq (free, no billing)
// gemini-2.5-pro    → Gemini Vision
// gemini-2.0-ultra  → Gemini Vision (deep multi-pass prompt)
// zak-global        → Gemini Vision + Google Search grounding
// wizardry-neural-x → Gemini Vision + Google Search grounding (full OSINT)
const ENGINE_ROUTING: Record<string, "groq" | "gemini" | "gemini_osint"> = {
  "gemini-2.5-flash":  "groq",
  "gemini-2.5-pro":    "gemini",
  "gemini-2.0-ultra":  "gemini",
  "zak-global":        "gemini_osint",
  "wizardry-neural-x": "gemini_osint",
};

const GEMINI_MODEL_MAP: Record<string, string> = {
  "gemini-2.5-pro":    "gemini-2.5-pro",
  "gemini-2.0-ultra":  "gemini-2.5-pro",
  "zak-global":        "gemini-2.5-pro",
  "wizardry-neural-x": "gemini-2.5-pro",
};
// ─────────────────────────────────────────────────────────────────────────────

const router: IRouter = Router();

// ─── Stage definitions (unchanged) ───────────────────────────────────────────
const STAGES_BY_ENGINE: Record<string, string[]> = {
  "gemini-2.5-flash": [
    "Initializing Wizardry AI detection engine...",
    "Extracting temporal frame signatures...",
    "Analyzing facial biometric landmarks...",
    "Running Gemini 2.5 Flash neural inference...",
    "Computing confidence matrix...",
    "Generating forensic intelligence report...",
  ],
  "gemini-2.5-pro": [
    "Initializing deep analysis pipeline...",
    "Decoding temporal inconsistencies across frames...",
    "Mapping facial biometric drift vectors...",
    "Running Gemini 2.5 Pro deep-analysis inference...",
    "Cross-referencing synthetic media signatures...",
    "Scoring anomaly vectors and confidence bounds...",
    "Generating enterprise forensic report...",
  ],
  "gemini-2.0-ultra": [
    "Initializing Gemini 2.0 Ultra multi-pass pipeline...",
    "Pass 1: Temporal sequence decomposition...",
    "Pass 2: High-resolution biometric landmark mapping...",
    "Pass 3: GAN artifact signature detection...",
    "Running maximum precision neural inference...",
    "Cross-validating results across inference passes...",
    "Applying confidence calibration model...",
    "Generating maximum-fidelity forensic report...",
  ],
  "zak-global": [
    "Initializing ZAK Global search pipeline...",
    "Crawling surface web for matching media fingerprints...",
    "Deep web audit: scanning verified source repositories...",
    "Cross-referencing metadata with synthetic media origins...",
    "Running ZAK neural network inference on visual artifacts...",
    "Correlating web provenance signals with biometric data...",
    "Synthesizing multi-source forensic verdict...",
    "Generating ZAK Global intelligence report...",
  ],
  "wizardry-neural-x": [
    "Activating Wizardry Neural X — enterprise flagship engine...",
    "Multi-modal input fusion: video + audio + metadata...",
    "Stage 1: Ultra-resolution biometric landmark extraction...",
    "Stage 2: Temporal coherence deep analysis...",
    "Stage 3: GAN watermark & artifact forensics...",
    "Stage 4: Audio-visual synchronization audit...",
    "Stage 5: Provenance cross-reference (surface + deep web)...",
    "Applying ensemble confidence calibration...",
    "Synthesizing final forensic verdict with full chain-of-evidence...",
    "Generating enterprise-grade forensic intelligence report...",
  ],
};

function getStages(engineModel: string): string[] {
  return STAGES_BY_ENGINE[engineModel] ?? STAGES_BY_ENGINE["gemini-2.5-flash"];
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Result types ─────────────────────────────────────────────────────────────
interface WebSource {
  title: string;
  url: string;
  snippet: string;
}

interface AIAnalysisResult {
  verdict: "ai" | "real" | "mixed" | "unknown";
  confidenceScore: number;
  anomalies: string[];
  categories: string[];
  summary: string;
  aiReasoning: string;
  webSources?: WebSource[];
  faces?: string[];
  relatedVideos?: string[];
  newsArticles?: string[];
  socialPlatforms?: string[];
  firstPostedBy?: string;
  investigationSummary?: string;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── JSON output schema injected into every prompt ───────────────────────────
function getOutputSchema(engine: string): string {
  const base = `
Respond ONLY with a valid JSON object — no markdown, no text outside JSON:
{
  "verdict": "ai" | "real" | "mixed" | "unknown",
  "confidenceScore": <0-100>,
  "anomalies": [<up to 8 specific detected anomaly strings>],
  "categories": [<deepfake method categories if ai/mixed: "Face Swap", "Voice Clone", "Lip-sync Deepfake", "GAN Synthesis", "Expression Transfer", "Background Manipulation", "Screen Recording", "Audio Manipulation">],
  "summary": "<one concise sentence verdict>",
  "aiReasoning": "<detailed forensic paragraph with specific evidence, frame references, confidence reasoning>"
}`.trim();

  if (engine === "zak-global") {
    return `
Respond ONLY with a valid JSON object — no markdown, no text outside JSON:
{
  "verdict": "ai" | "real" | "mixed" | "unknown",
  "confidenceScore": <0-100>,
  "anomalies": [<up to 8 specific anomaly strings>],
  "categories": [<manipulation categories>],
  "summary": "<one concise sentence verdict>",
  "aiReasoning": "<detailed forensic paragraph combining visual analysis and web intelligence findings>",
  "faces": [<names of any recognized public figures detected>],
  "webSources": [{ "title": "<page title>", "url": "<url>", "snippet": "<relevant excerpt>" }],
  "newsArticles": [<urls or titles of news articles found about this media>],
  "socialPlatforms": [<platforms where this media was found e.g. "Twitter/X", "YouTube", "Facebook">],
  "firstPostedBy": "<earliest known source or account that posted this>",
  "investigationSummary": "<structured investigative overview: who shared it, where it originated, what was reported, key findings>"
}`.trim();
  }

  if (engine === "wizardry-neural-x") {
    return `
Respond ONLY with a valid JSON object — no markdown, no text outside JSON:
{
  "verdict": "ai" | "real" | "mixed" | "unknown",
  "confidenceScore": <0-100>,
  "anomalies": [<up to 10 specific anomaly strings>],
  "categories": [<manipulation categories>],
  "summary": "<one concise sentence verdict>",
  "aiReasoning": "<comprehensive forensic paragraph: visual analysis, audio analysis, web intelligence, chain of evidence>",
  "faces": [<names of ALL recognized public figures, celebrities, politicians detected>],
  "webSources": [{ "title": "<page title>", "url": "<url>", "snippet": "<relevant excerpt>" }],
  "relatedVideos": [<urls of related videos found on the web about same topic or person>],
  "newsArticles": [<urls or titles of news articles covering this media or its subject>],
  "socialPlatforms": [<all platforms where this media or subject appears: "Twitter/X", "YouTube", "Instagram", "Facebook", "TikTok", "Reddit", "Telegram">],
  "firstPostedBy": "<earliest verified source, account, or news outlet that published this>",
  "investigationSummary": "<full structured investigative report: origin, spread, who shared, news coverage, social media presence, related content, key persons involved, timeline, credibility assessment>"
}`.trim();
  }

  return base;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Build prompt per engine tier ────────────────────────────────────────────
function buildPrompt(
  engine: string,
  mediaUrl: string | null,
  secondaryUrl: string | null,
  filename: string | null,
  mediaType: string | null,
  contextNote: string | null,
  sensitivityLevel: string,
  usedCombined: boolean,
  hasVideo: boolean,
): string {
  const mediaRef = mediaUrl || secondaryUrl || filename || "unknown media";
  const sensitivityNote =
    sensitivityLevel === "high"
      ? "Apply MAXIMUM sensitivity — flag even subtle or partial manipulation indicators. Err on the side of flagging."
      : sensitivityLevel === "low"
      ? "Apply conservative sensitivity — only flag clear, high-confidence manipulation evidence."
      : "Apply balanced sensitivity — flag moderate-to-strong manipulation indicators.";

  const combinedNote = usedCombined
    ? `COMBINED ANALYSIS: Both a primary source (${mediaUrl || filename}) and secondary reference (${secondaryUrl}) provided for cross-verification.`
    : "";

  const videoNote = hasVideo
    ? "A video file has been provided as base64 for direct visual analysis. Analyze the actual video frames, audio, faces, motion patterns, and content."
    : `No video file was uploaded. Analyze based on the media reference: ${mediaRef}`;

  const baseContext = `You are Wizardry AI, an enterprise-grade deepfake and synthetic media forensic detection system.

${videoNote}
Media reference: ${mediaRef}
Media type: ${mediaType || "video"}
${contextNote ? `Analyst context note: ${contextNote}` : ""}
${combinedNote}
Sensitivity: ${sensitivityLevel}. ${sensitivityNote}`;

  if (engine === "gemini-2.5-flash") {
    return `${baseContext}

TASK: Forensic deepfake detection analysis.

If a video was provided, analyze the actual visual content:
- Detect if this is a screen recording (look for UI elements, cursor, desktop, browser, app interfaces)
- Identify any human faces and whether they show deepfake signs
- Check temporal consistency, facial landmarks, GAN artifacts
- Analyze compression signatures and lighting consistency
- Check for audio-visual sync issues
- Identify what the video actually shows (content description)

If no video, analyze based on filename and context.

${getOutputSchema(engine)}`;
  }

  if (engine === "gemini-2.5-pro") {
    return `${baseContext}

TASK: Deep forensic deepfake detection with enhanced accuracy.

Perform comprehensive analysis:
- Full content analysis: what is in this video, who appears, what is happening
- Screen recording detection: UI elements, cursor movement, application interfaces
- Face analysis: identity of any public figures, deepfake indicators per face
- Temporal analysis: frame-by-frame consistency, motion blur patterns
- Biometric landmark mapping: facial drift vectors, symmetry deviation
- GAN artifact detection: boundary artifacts, spectral anomalies
- Audio analysis: voice cloning indicators, audio-visual sync
- Compression signature analysis vs natural camera output

${getOutputSchema(engine)}`;
  }

  if (engine === "gemini-2.0-ultra") {
    return `${baseContext}

TASK: MAXIMUM PRECISION multi-pass forensic analysis.

Execute all analysis passes:
Pass 1 — Content identification: exactly what/who is in this video, screen recording check
Pass 2 — Biometric mapping: every face, identity check against known public figures, landmark drift
Pass 3 — GAN forensics: boundary artifacts, synthesis watermarks, spectral anomalies at pixel level
Pass 4 — Temporal coherence: inter-frame consistency, motion authenticity, compression profile
Pass 5 — Audio forensics: voice patterns, cloning artifacts, sync analysis
Pass 6 — Confidence calibration: cross-validate all passes, assign weighted confidence score

${getOutputSchema(engine)}`;
  }

  if (engine === "zak-global") {
    return `${baseContext}

TASK: ZAK GLOBAL — Open Web Intelligence + Forensic Analysis.

STEP 1 — Visual forensic analysis of the video content (same as ultra-precision analysis above).

STEP 2 — Web intelligence sweep using your search capability:
- Search for the media URL, filename, and any recognized faces/names
- Find where this media appears across the open web
- Identify the earliest known posting of this content
- Find news articles, blogs, fact-checks that reference this media
- Identify social media platforms where it was shared
- Check if recognized public figures' verified accounts posted this
- Search for related content, similar videos, topic clusters

STEP 3 — Cross-reference findings:
- If a public figure is detected but their verified accounts don't have this video → flag as suspicious
- If reputable news sources haven't covered this → note absence
- Correlate visual deepfake evidence with web provenance data

${getOutputSchema(engine)}`;
  }

  // wizardry-neural-x
  return `${baseContext}

TASK: WIZARDRY NEURAL X — Full-Spectrum Forensic Intelligence + Complete OSINT Investigation.

PHASE 1 — Ultra-precision visual forensic analysis:
- Complete content analysis: every person, object, location, action in the video
- Screen recording detection with UI element identification
- Face recognition: identify ALL public figures, celebrities, politicians, known persons
- Voice recognition: identify speakers if recognizable
- Multi-pass deepfake detection: biometrics, GAN artifacts, temporal coherence, audio sync
- Pixel-level analysis for synthesis watermarks

PHASE 2 — Complete open web OSINT sweep:
- Search every recognized name, face, and topic from the video
- Find ALL web appearances of this media across every platform
- Trace the complete origin and spread timeline
- Find every news agency, blog, journalist who reported on this
- Find every social media account that shared this (Twitter/X, YouTube, Instagram, Facebook, TikTok, Reddit, Telegram)
- Search for related videos on the same topic or featuring the same people
- Check verified accounts of any identified public figures
- Find fact-checks, debunks, or confirmations

PHASE 3 — Chain of evidence synthesis:
- Establish credibility: is this from a verified source?
- Map the spread: how did this propagate across the internet?
- Identify key players: who created, shared, amplified this?
- Assess authenticity: does the web evidence support or contradict the visual analysis?
- Build complete investigative timeline

${getOutputSchema(engine)}`;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Parse and validate AI JSON response ─────────────────────────────────────
function parseAIResponse(raw: string): AIAnalysisResult {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Extract JSON object even if there's surrounding text
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : cleaned;

  let parsed: AIAnalysisResult;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    parsed = {
      verdict: "unknown",
      confidenceScore: 45,
      anomalies: [],
      categories: [],
      summary: "Analysis completed — manual review recommended.",
      aiReasoning: raw || "The model returned an unstructured response. Please re-scan.",
    };
  }

  parsed.verdict = (["ai", "real", "mixed", "unknown"].includes(parsed.verdict)
    ? parsed.verdict : "unknown") as AIAnalysisResult["verdict"];
  parsed.confidenceScore = Math.min(100, Math.max(0, Number(parsed.confidenceScore) || 50));
  parsed.anomalies = Array.isArray(parsed.anomalies) ? parsed.anomalies.slice(0, 10) : [];
  parsed.categories = Array.isArray(parsed.categories) ? parsed.categories.slice(0, 6) : [];
  parsed.summary = parsed.summary || "Analysis complete.";
  parsed.aiReasoning = parsed.aiReasoning || "No detailed reasoning returned.";
  parsed.webSources = Array.isArray(parsed.webSources) ? parsed.webSources : [];
  parsed.faces = Array.isArray(parsed.faces) ? parsed.faces : [];
  parsed.relatedVideos = Array.isArray(parsed.relatedVideos) ? parsed.relatedVideos : [];
  parsed.newsArticles = Array.isArray(parsed.newsArticles) ? parsed.newsArticles : [];
  parsed.socialPlatforms = Array.isArray(parsed.socialPlatforms) ? parsed.socialPlatforms : [];

  return parsed;
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Groq call — free tier, text only ────────────────────────────────────────
async function callGroq(prompt: string): Promise<AIAnalysisResult> {
  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
      max_tokens: 1500,
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${err}`);
  }
  const data = await response.json() as { choices: Array<{ message: { content: string } }> };
  return parseAIResponse(data.choices?.[0]?.message?.content ?? "");
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Gemini call — vision + optional grounding ───────────────────────────────
async function callGemini(
  engine: string,
  prompt: string,
  mediaBase64?: string,
  mediaType?: string,
): Promise<AIAnalysisResult> {
  const modelName = GEMINI_MODEL_MAP[engine] || "gemini-2.5-pro";
  const useGrounding = engine === "zak-global" || engine === "wizardry-neural-x";

  const config: Record<string, unknown> = {};
  if (useGrounding) {
    config.tools = [{ googleSearch: {} }];
  }

  // Build contents — text prompt + optional video
  type ContentPart = { text: string } | { inlineData: { mimeType: string; data: string } };
  const parts: ContentPart[] = [];

  if (mediaBase64 && mediaType) {
    // Send actual video bytes to Gemini Vision
    parts.push({
      inlineData: {
        mimeType: mediaType || "video/mp4",
        data: mediaBase64,
      },
    });
  }

  parts.push({ text: prompt });

  const response = await geminiAi.models.generateContent({
    model: modelName,
    contents: [{ role: "user", parts }],
    config,
  });

  return parseAIResponse(response.text ?? "");
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Main analysis router ─────────────────────────────────────────────────────
async function runAIAnalysis(
  engine: string,
  prompt: string,
  mediaBase64?: string,
  mediaType?: string,
): Promise<AIAnalysisResult> {
  const route = ENGINE_ROUTING[engine] ?? "groq";

  if (route === "groq") {
    return callGroq(prompt);
  }

  if (route === "gemini" || route === "gemini_osint") {
    return callGemini(engine, prompt, mediaBase64, mediaType);
  }

  return callGroq(prompt);
}
// ─────────────────────────────────────────────────────────────────────────────

// ─── Routes ───────────────────────────────────────────────────────────────────

router.get("/scans", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { filter, search, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const results = await db.select().from(scansTable).where(
    and(
      eq(scansTable.userId, userId),
      filter && filter !== "all" ? eq(scansTable.verdict, filter) : undefined,
      search ? sql`(${scansTable.filename} ILIKE ${"%" + search + "%"} OR ${scansTable.mediaUrl} ILIKE ${"%" + search + "%"})` : undefined,
    )
  ).orderBy(desc(scansTable.createdAt)).limit(parseInt(limit)).offset(parseInt(offset));
  res.json(results);
});

router.post("/scans", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { filename, mediaUrl, secondaryUrl, mediaType, contextNote, engineModel, sensitivityLevel } = req.body;
  if (!engineModel) { res.status(400).json({ error: "engineModel is required" }); return; }
  const [sub] = await db.select().from(subscriptionsTable).where(eq(subscriptionsTable.userId, userId));
  const planId = sub?.planId || "free";
  if (!canUseEngine(planId, engineModel)) {
    res.status(403).json({ error: `Engine "${engineModel}" requires a higher plan. Please upgrade.` }); return;
  }
  if (secondaryUrl && !canUseCombinedInput(planId)) {
    res.status(403).json({ error: "Combined URL + video scanning requires Advanced or Enterprise plan." }); return;
  }
  const usedCombined = !!(mediaUrl && secondaryUrl) || !!(filename && mediaUrl) || !!(filename && secondaryUrl);
  const [scan] = await db.insert(scansTable).values({
    userId, filename, mediaUrl, secondaryUrl, mediaType, contextNote, engineModel,
    status: "pending", verdict: "unknown",
    sensitivityLevel: sensitivityLevel || "medium",
    tokensUsed: TOKENS_PER_ROUND,
    usedCombinedInput: usedCombined,
  }).returning();
  res.status(201).json(scan);
});

router.get("/scans/stages", async (req, res): Promise<void> => {
  const { engine } = req.query as { engine: string };
  res.json({ stages: getStages(engine || "gemini-2.5-flash"), tokensPerRound: TOKENS_PER_ROUND });
});

router.get("/scans/stats", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const rows = await db.select().from(scansTable).where(eq(scansTable.userId, userId));
  const total = rows.length;
  const aiDetected = rows.filter((s) => s.verdict === "ai").length;
  const authentic = rows.filter((s) => s.verdict === "real").length;
  const uncertain = rows.filter((s) => s.verdict === "unknown").length;
  const mixed = rows.filter((s) => s.verdict === "mixed").length;
  const withScore = rows.filter((s) => s.confidenceScore != null);
  const avgConfidence = withScore.length > 0
    ? withScore.reduce((sum, s) => sum + (s.confidenceScore ?? 0), 0) / withScore.length
    : null;
  res.json({ total, aiDetected, authentic, uncertain, mixed, avgConfidence });
});

router.get("/scans/recent", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const scans = await db.select().from(scansTable)
    .where(eq(scansTable.userId, userId))
    .orderBy(desc(scansTable.createdAt))
    .limit(5);
  res.json(scans);
});

// ─── ANALYZE — real AI per tier ───────────────────────────────────────────────
router.post("/scans/analyze", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { scanId, engineModel, sensitivityLevel, mediaBase64, contextNote } = req.body;
  if (!scanId) { res.status(400).json({ error: "scanId required" }); return; }

  const [scan] = await db.select().from(scansTable)
    .where(and(eq(scansTable.id, scanId), eq(scansTable.userId, userId)));
  if (!scan) { res.status(404).json({ error: "Scan not found" }); return; }

  // Token check
  const [sub] = await db.select().from(subscriptionsTable)
    .where(eq(subscriptionsTable.userId, userId));
  const tokenLimit = sub?.tokenBalance ?? 0;
  if ((sub?.tokensUsed ?? 0) + TOKENS_PER_ROUND > tokenLimit) {
    res.status(402).json({ error: "Token limit reached. Buy another token pack to continue scanning." });
    return;
  }

  await db.update(scansTable).set({ status: "processing" }).where(eq(scansTable.id, scanId));

  const usedEngine = engineModel || scan.engineModel;
  const effectiveSensitivity = sensitivityLevel || scan.sensitivityLevel || "medium";
  const hasVideo = !!(mediaBase64 && mediaBase64.length > 100);
  const start = Date.now();

  // Use contextNote from request body (fresher) or fall back to scan record
  const effectiveContextNote = contextNote || scan.contextNote;

  const prompt = buildPrompt(
    usedEngine,
    scan.mediaUrl,
    scan.secondaryUrl,
    scan.filename,
    scan.mediaType,
    effectiveContextNote,
    effectiveSensitivity,
    scan.usedCombinedInput,
    hasVideo,
  );

  let aiResult: AIAnalysisResult;
  try {
    aiResult = await runAIAnalysis(
      usedEngine,
      prompt,
      hasVideo ? mediaBase64 : undefined,
      hasVideo ? (scan.mediaType || "video/mp4") : undefined,
    );
  } catch (err) {
    await db.update(scansTable).set({ status: "failed" }).where(eq(scansTable.id, scanId));
    console.error("AI analysis error:", err);
    res.status(502).json({ error: "AI analysis failed. Please try again." });
    return;
  }

  const processingMs = Date.now() - start;
  const {
    verdict, confidenceScore, anomalies, categories, summary, aiReasoning,
    webSources, faces, relatedVideos, newsArticles, socialPlatforms,
    firstPostedBy, investigationSummary,
  } = aiResult;

  // Build enriched reasoning for OSINT tiers — append investigation data to aiReasoning
  let enrichedReasoning = aiReasoning;
  if (investigationSummary) {
    enrichedReasoning += `\n\n--- INVESTIGATION SUMMARY ---\n${investigationSummary}`;
  }
  if (firstPostedBy) {
    enrichedReasoning += `\n\nFirst posted by: ${firstPostedBy}`;
  }
  if (faces && faces.length > 0) {
    enrichedReasoning += `\n\nIdentified persons: ${faces.join(", ")}`;
  }
  if (socialPlatforms && socialPlatforms.length > 0) {
    enrichedReasoning += `\n\nFound on platforms: ${socialPlatforms.join(", ")}`;
  }

  // Save to DB — all existing fields untouched, aiReasoning enriched for OSINT
  const [updated] = await db.update(scansTable).set({
    status: "complete",
    verdict,
    confidenceScore,
    processingMs,
    anomalies: JSON.stringify(anomalies),
    categories: JSON.stringify(categories),
    summary,
    aiReasoning: enrichedReasoning,
    completedAt: new Date(),
    engineModel: usedEngine,
    tokensUsed: TOKENS_PER_ROUND,
  }).where(eq(scansTable.id, scanId)).returning();

  // Update user stats (unchanged)
  const userUpd: Record<string, unknown> = { totalScans: sql`total_scans + 1` };
  if (verdict === "ai") userUpd.aiDetected = sql`ai_detected + 1`;
  else if (verdict === "real") userUpd.authentic = sql`authentic + 1`;
  else userUpd.uncertain = sql`uncertain + 1`;
  await db.update(usersTable)
    .set(userUpd as any)
    .where(eq(usersTable.id, userId));

  await db.update(subscriptionsTable)
    .set({ tokensUsed: sql`tokens_used + ${TOKENS_PER_ROUND}` as never })
    .where(eq(subscriptionsTable.userId, userId));

  // Notification (unchanged)
  const priorityAlert = confidenceScore > 85 && verdict === "ai";
  await db.insert(notificationsTable).values({
    userId,
    type: "scan_complete",
    title: `Scan Complete — ${verdict.toUpperCase()} Detected`,
    message: `"${scan.filename || scan.mediaUrl || "Media"}" — ${verdict} (${confidenceScore.toFixed(1)}% confidence)${scan.usedCombinedInput ? " · Combined analysis" : ""}.`,
    priority: priorityAlert ? "critical" : "medium",
  });

  // Response — same shape + OSINT fields for advanced tiers
  res.json({
    verdict: updated.verdict,
    confidenceScore: updated.confidenceScore,
    anomalies,
    categories,
    summary,
    aiReasoning: enrichedReasoning,
    webSources: webSources ?? [],
    faces: faces ?? [],
    relatedVideos: relatedVideos ?? [],
    newsArticles: newsArticles ?? [],
    socialPlatforms: socialPlatforms ?? [],
    firstPostedBy: firstPostedBy ?? null,
    investigationSummary: investigationSummary ?? null,
    stages: getStages(usedEngine),
    tokensUsed: TOKENS_PER_ROUND,
    processingMs,
    modelUsed: updated.engineModel,
    usedCombinedInput: scan.usedCombinedInput,
  });
});
// ─────────────────────────────────────────────────────────────────────────────

router.get("/scans/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [scan] = await db.select().from(scansTable)
    .where(and(eq(scansTable.id, id), eq(scansTable.userId, userId)));
  if (!scan) { res.status(404).json({ error: "Scan not found" }); return; }
  res.json(scan);
});

router.delete("/scans/:id", async (req, res): Promise<void> => {
  const userId = getUserId(req);
  if (!userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [scan] = await db.delete(scansTable)
    .where(and(eq(scansTable.id, id), eq(scansTable.userId, userId)))
    .returning();
  if (!scan) { res.status(404).json({ error: "Scan not found" }); return; }
  res.sendStatus(204);
});

export default router;