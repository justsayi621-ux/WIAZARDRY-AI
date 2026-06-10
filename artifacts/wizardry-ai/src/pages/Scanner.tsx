import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, Play, ScanLine, AlertCircle, CheckCircle2, Info, Lock, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatConfidence, parseJsonArray } from "@/lib/utils";
import { useCreateScan, useAnalyzeScan, useGetTokenBalance, useGetCurrentSubscription } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetRecentScansQueryKey, getGetScanStatsQueryKey, getGetDashboardStatsQueryKey, getGetTokenBalanceQueryKey } from "@workspace/api-client-react";
import VerdictBadge from "@/components/VerdictBadge";
import ScanStageModal from "@/components/ScanStageModal";
import { MOCK_USER_ID } from "@/hooks/useCurrentUser";

const AI_ENGINES = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash — Ultra Fast", minTier: "free",       badge: null,         badgeColor: "" },
  { value: "gemini-2.5-pro",   label: "Gemini 2.5 Pro — Deep Analysis",    minTier: "basic",      badge: "Basic+",     badgeColor: "text-blue-400 border-blue-400/40 bg-blue-400/10" },
  { value: "gemini-2.0-ultra", label: "Gemini 2.0 Ultra — Max Precision",  minTier: "pro",        badge: "Pro+",       badgeColor: "text-violet-400 border-violet-400/40 bg-violet-400/10" },
  { value: "zak-global",       label: "ZAK Global — Surface + Deep Web",   minTier: "advanced",   badge: "Advanced+",  badgeColor: "text-cyan-400 border-cyan-400/40 bg-cyan-400/10" },
  { value: "wizardry-neural-x",label: "Wizardry Neural X — Enterprise",    minTier: "enterprise", badge: "Enterprise", badgeColor: "text-amber-400 border-amber-400/40 bg-amber-400/10" },
];

const TIER_RANK: Record<string, number> = { free: 0, basic: 1, pro: 2, advanced: 3, enterprise: 4 };

const SENSITIVITY_LEVELS = ["low", "medium", "high"] as const;

const STAGE_MAP: Record<string, string[]> = {
  "gemini-2.5-flash":  ["Initializing detection engine...", "Extracting temporal frame signatures...", "Analyzing facial biometric landmarks...", "Running Gemini 2.5 Flash inference...", "Computing confidence matrix...", "Generating forensic report..."],
  "gemini-2.5-pro":    ["Initializing deep analysis pipeline...", "Decoding temporal inconsistencies...", "Mapping facial biometric drift vectors...", "Running Gemini 2.5 Pro inference...", "Cross-referencing synthetic signatures...", "Scoring anomaly vectors...", "Generating enterprise forensic report..."],
  "gemini-2.0-ultra":  ["Initializing Gemini 2.0 Ultra pipeline...", "Pass 1: Temporal sequence decomposition...", "Pass 2: High-res biometric landmark mapping...", "Pass 3: GAN artifact signature detection...", "Running maximum precision inference...", "Cross-validating results...", "Applying confidence calibration...", "Generating max-fidelity report..."],
  "zak-global":        ["Initializing ZAK Global search pipeline...", "Crawling surface web for media fingerprints...", "Deep web audit: scanning source repositories...", "Cross-referencing metadata with synthetic origins...", "Running ZAK neural inference...", "Correlating web provenance signals...", "Synthesizing multi-source verdict...", "Generating ZAK intelligence report..."],
  "wizardry-neural-x": ["Activating Wizardry Neural X — flagship engine...", "Multi-modal input fusion: video + audio + metadata...", "Stage 1: Ultra-res biometric landmark extraction...", "Stage 2: Temporal coherence deep analysis...", "Stage 3: GAN watermark forensics...", "Stage 4: Audio-visual sync audit...", "Stage 5: Provenance cross-reference...", "Applying ensemble confidence calibration...", "Synthesizing final verdict with chain-of-evidence...", "Generating enterprise-grade forensic report..."],
};

type ScanPhase = "idle" | "scanning" | "complete" | "failed";

interface AnalysisResult {
  verdict: string;
  confidenceScore: number | null;
  anomalies: string[];
  categories: string[];
  summary: string;
  aiReasoning: string;
  tokensUsed: number;
  processingMs: number;
  modelUsed: string;
  usedCombinedInput: boolean;
}

export default function Scanner() {
  const [file, setFile] = useState<File | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [secondaryUrl, setSecondaryUrl] = useState("");
  const [contextNote, setContextNote] = useState("");
  const [engine, setEngine] = useState(AI_ENGINES[0].value);
  const [sensitivity, setSensitivity] = useState<"low" | "medium" | "high">("medium");
  const [phase, setPhase] = useState<ScanPhase>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showStages, setShowStages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const createScan = useCreateScan();
  const analyzeScan = useAnalyzeScan();
  const { data: tokenBalance } = useGetTokenBalance();
  const { data: subscription } = useGetCurrentSubscription();

  const planId = subscription?.planId || "free";
  const tierRank = TIER_RANK[planId] ?? 0;
  const canUseCombined = tierRank >= TIER_RANK["advanced"];

  const hasInput = !!(file || urlInput.trim());
  const isExhausted = tokenBalance?.isExhausted ?? false;

  // Auto-select best available engine when plan changes
  useEffect(() => {
    const best = AI_ENGINES.filter((e) => TIER_RANK[e.minTier] <= tierRank).pop();
    if (best && TIER_RANK[engine.split("-")[0]] === undefined) {
      setEngine(best.value);
    }
  }, [tierRank]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setFile(f); setBlobUrl(URL.createObjectURL(f));
    setResult(null); setErrorMsg(null); setPhase("idle");
  }, [blobUrl]);

  const handleRemoveFile = useCallback(() => {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    setFile(null); setBlobUrl(null); setPhase("idle"); setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [blobUrl]);

  const handleScan = useCallback(async () => {
    if (!hasInput || isExhausted) return;
    setPhase("scanning");
    setResult(null);
    setErrorMsg(null);
    setShowStages(true);
    try {
      const scan = await createScan.mutateAsync({
        data: {
          filename: file?.name ?? undefined,
          mediaUrl: urlInput || undefined,
          ...(secondaryUrl ? { secondaryUrl } : {}),
          mediaType: file?.type ?? "video/mp4",
          contextNote: contextNote || undefined,
          engineModel: engine,
          sensitivityLevel: sensitivity,
        } as never,
      });
      const analysis = await analyzeScan.mutateAsync({
        data: { scanId: scan.id, engineModel: engine, contextNote: contextNote || undefined, sensitivityLevel: sensitivity },
      });
      setResult({
        verdict: analysis.verdict,
        confidenceScore: (analysis as unknown as { confidenceScore?: number }).confidenceScore ?? null,
        anomalies: Array.isArray(analysis.anomalies) ? analysis.anomalies as unknown as string[] : parseJsonArray((analysis.anomalies as unknown as string) ?? ""),
        categories: Array.isArray(analysis.categories) ? analysis.categories as unknown as string[] : parseJsonArray((analysis.categories as unknown as string) ?? ""),
        summary: (analysis as unknown as { summary?: string }).summary ?? "",
        aiReasoning: (analysis as unknown as { aiReasoning?: string }).aiReasoning ?? "",
        tokensUsed: (analysis as unknown as { tokensUsed?: number }).tokensUsed ?? 5,
        processingMs: (analysis as unknown as { processingMs?: number }).processingMs ?? 0,
        modelUsed: (analysis as unknown as { modelUsed?: string }).modelUsed ?? engine,
        usedCombinedInput: (analysis as unknown as { usedCombinedInput?: boolean }).usedCombinedInput ?? false,
      });
      setPhase("complete");
      setTimeout(() => setShowStages(false), 600);
      queryClient.invalidateQueries({ queryKey: getGetRecentScansQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetScanStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTokenBalanceQueryKey() });
    } catch (err: unknown) {
      setPhase("failed");
      setShowStages(false);
      const msg = (err as { data?: { error?: string } })?.data?.error ?? "Scan failed. Please try again.";
      setErrorMsg(msg);
    }
  }, [hasInput, isExhausted, file, urlInput, secondaryUrl, contextNote, engine, sensitivity, createScan, analyzeScan, queryClient]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <ScanLine className="w-5 h-5 text-primary" />
          Forensic Scanner
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Upload media or paste a URL and run enterprise-grade AI deepfake detection.</p>
      </div>

      {isExhausted && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/8 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-destructive">Token limit reached</p>
            <p className="text-xs text-muted-foreground mt-1">You've used all 5 tokens (1 scan). Upgrade to continue scanning.</p>
          </div>
        </div>
      )}
      {tokenBalance?.isNearLimit && !isExhausted && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-3 flex items-center gap-3 text-sm">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-amber-300">Running low: <strong>{tokenBalance.tokensRemaining}</strong> tokens remaining.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input & Config */}
        <div className="space-y-5">
          {/* Media Input */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Media Input</h2>

            {!blobUrl ? (
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-primary/5 transition-all p-8 flex flex-col items-center gap-3 text-muted-foreground hover:text-primary"
                >
                  <Upload className="w-8 h-8" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Upload Video File</p>
                    <p className="text-xs mt-1">MP4, MOV, AVI, WebM supported</p>
                  </div>
                </button>
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <input
                  type="url"
                  placeholder="Paste primary video URL..."
                  value={urlInput}
                  onChange={(e) => { setUrlInput(e.target.value); setResult(null); setPhase("idle"); }}
                  className="mt-3 w-full bg-input/50 border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden bg-black border border-border">
                  <video src={blobUrl} controls className="w-full max-h-48 object-contain" />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate max-w-50 mono">{file?.name}</span>
                  <button onClick={handleRemoveFile} className="flex items-center gap-1 text-destructive hover:text-destructive/80 transition-colors ml-2">
                    <X className="w-3.5 h-3.5" />Remove
                  </button>
                </div>
                {/* Combined URL input when file is uploaded */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Reference URL (combined analysis)</label>
                    {!canUseCombined && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                        <Lock className="w-2.5 h-2.5" />Advanced+
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="url"
                      placeholder={canUseCombined ? "Optional: paste a reference URL for combined analysis..." : "Upgrade to Advanced+ to enable combined scanning"}
                      value={secondaryUrl}
                      onChange={(e) => setSecondaryUrl(e.target.value)}
                      disabled={!canUseCombined}
                      className="w-full bg-input/50 border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
                    />
                    {secondaryUrl && canUseCombined && <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />}
                  </div>
                </div>
              </div>
            )}

            {/* Secondary URL when using URL input mode */}
            {!blobUrl && urlInput && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Secondary URL (combined analysis)</label>
                  {!canUseCombined && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                      <Lock className="w-2.5 h-2.5" />Advanced+
                    </span>
                  )}
                </div>
                <input
                  type="url"
                  placeholder={canUseCombined ? "Optional second URL for cross-verified analysis..." : "Advanced+ required"}
                  value={secondaryUrl}
                  onChange={(e) => setSecondaryUrl(e.target.value)}
                  disabled={!canUseCombined}
                  className="w-full bg-input/50 border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
                />
                {canUseCombined && secondaryUrl && (
                  <p className="text-[11px] text-cyan-400 flex items-center gap-1.5">
                    <Link2 className="w-3 h-3" />Combined multi-source analysis will be performed
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Context & Engine Config */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Context / Description</label>
              <textarea
                rows={2}
                value={contextNote}
                onChange={(e) => setContextNote(e.target.value)}
                placeholder="Optional notes to guide the AI analysis..."
                className="w-full bg-input/40 border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Engine Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">AI Engine Layer</label>
              <div className="space-y-1.5">
                {AI_ENGINES.map((eng) => {
                  const available = TIER_RANK[eng.minTier] <= tierRank;
                  const selected = engine === eng.value;
                  return (
                    <button
                      key={eng.value}
                      onClick={() => available && setEngine(eng.value)}
                      disabled={!available}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-all",
                        selected && available
                          ? "bg-primary/10 border-primary/40 text-foreground"
                          : available
                          ? "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/10"
                          : "border-border/30 text-muted-foreground/40 cursor-not-allowed bg-muted/5"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {selected && available && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                        {!available && <Lock className="w-3 h-3 shrink-0 text-muted-foreground/40" />}
                        <span className="text-xs font-medium truncate">{eng.label}</span>
                      </div>
                      {eng.badge && (
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ml-2", available ? eng.badgeColor : "text-muted-foreground/30 border-muted-foreground/20 bg-transparent")}>
                          {eng.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sensitivity */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scan Sensitivity</label>
              <div className="flex gap-2">
                {SENSITIVITY_LEVELS.map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setSensitivity(lvl)}
                    className={cn(
                      "flex-1 py-2 rounded-md text-xs font-semibold capitalize border transition-all",
                      sensitivity === lvl
                        ? lvl === "high" ? "bg-destructive/15 border-destructive/40 text-destructive"
                          : lvl === "medium" ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                          : "bg-primary/15 border-primary/30 text-primary"
                        : "border-border text-muted-foreground hover:border-border/80"
                    )}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Scan Button & Results */}
        <div className="flex flex-col gap-5">
          <div className="rounded-lg border border-border bg-card p-5 flex flex-col items-center gap-5">
            <h2 className="text-sm font-semibold text-foreground self-start">Initiate Scan</h2>
            <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
              {phase === "scanning" && (
                <>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="absolute rounded-full border border-primary/40 animate-radar-pulse" style={{ width: 60 + i * 30, height: 60 + i * 30, animationDelay: `${(i - 1) * 0.5}s` }} />
                  ))}
                  <div className="absolute w-full h-full rounded-full border border-primary/20 animate-radar-sweep"
                    style={{ background: "conic-gradient(from 0deg, transparent 0%, hsla(262,83%,58%,0.15) 30%, transparent 30%)" }}
                  />
                </>
              )}
              <button
                onClick={handleScan}
                disabled={!hasInput || isExhausted || phase === "scanning"}
                className={cn(
                  "relative z-10 w-28 h-28 rounded-full border-2 font-bold text-sm tracking-wider transition-all duration-300 select-none",
                  !hasInput || isExhausted
                    ? "border-border/30 bg-muted/20 text-muted-foreground cursor-not-allowed"
                    : phase === "scanning"
                    ? "border-primary/60 bg-primary/10 text-primary cursor-wait animate-glow-pulse"
                    : phase === "complete"
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15"
                    : "border-primary/50 bg-primary/10 text-primary hover:bg-primary/15 hover:border-primary glow-violet active:scale-95"
                )}
              >
                {phase === "scanning" ? (
                  <span className="flex flex-col items-center gap-1">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <span className="text-[10px]">SCANNING</span>
                  </span>
                ) : phase === "complete" ? (
                  <span className="flex flex-col items-center gap-1"><CheckCircle2 className="w-5 h-5" /><span className="text-[10px]">COMPLETE</span></span>
                ) : (
                  <span>SCAN NOW</span>
                )}
              </button>
            </div>

            {!hasInput && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5" />
                Upload a file or enter a URL to enable scanning
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Cost per scan:</span>
              <span className="mono text-primary font-semibold">5 tokens</span>
            </div>

            {/* Plan badge */}
            <div className={cn("text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider",
              planId === "enterprise" ? "text-amber-400 border-amber-400/30 bg-amber-400/10"
              : planId === "advanced" ? "text-cyan-400 border-cyan-400/30 bg-cyan-400/10"
              : planId === "pro" ? "text-violet-400 border-violet-400/30 bg-violet-400/10"
              : planId === "basic" ? "text-blue-400 border-blue-400/30 bg-blue-400/10"
              : "text-slate-400 border-slate-400/30 bg-slate-400/10"
            )}>
              {planId} plan · {tokenBalance?.tokensRemaining ?? 0} tokens remaining
            </div>
          </div>

          {/* Result */}
          {result && phase === "complete" && (
            <div className="rounded-lg border border-border bg-card p-5 space-y-4 animate-verdict-reveal">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Analysis Result</h3>
                <VerdictBadge verdict={result.verdict} size="md" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Confidence</div>
                  <div className="text-lg font-bold mono text-foreground mt-1">{formatConfidence(result.confidenceScore)}</div>
                </div>
                <div className="bg-muted/30 rounded-md p-3">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Engine</div>
                  <div className="text-xs font-medium text-foreground mt-1 truncate">{result.modelUsed}</div>
                </div>
              </div>
              {result.usedCombinedInput && (
                <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-500/8 border border-cyan-500/20 rounded px-3 py-2">
                  <Link2 className="w-3.5 h-3.5 shrink-0" />
                  Combined multi-source analysis performed
                </div>
              )}
              {result.summary && <p className="text-xs text-muted-foreground leading-relaxed">{result.summary}</p>}
              {result.anomalies.length > 0 && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Anomalies Detected</div>
                  <div className="space-y-1">
                    {result.anomalies.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/8 rounded px-2.5 py-1.5 border border-amber-500/20 animate-stagger-in" style={{ animationDelay: `${i * 0.08}s` }}>
                        <AlertCircle className="w-3 h-3 shrink-0" />{a}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {result.categories.length > 0 && (
                <div>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Categories</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.categories.map((c, i) => (
                      <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-destructive/15 text-destructive border border-destructive/25">{c}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-3">
                <span>Tokens used: <span className="text-primary mono font-semibold">{result.tokensUsed}</span></span>
                <span>Time: <span className="mono">{result.processingMs}ms</span></span>
              </div>
            </div>
          )}

          {phase === "failed" && errorMsg && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/8 p-4 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Scan Failed</p>
                <p className="text-xs text-muted-foreground mt-1">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Animated Stage Modal */}
      <ScanStageModal
        stages={STAGE_MAP[engine] ?? STAGE_MAP["gemini-2.5-flash"]}
        engine={engine}
        isOpen={showStages}
      />
    </div>
  );
}
