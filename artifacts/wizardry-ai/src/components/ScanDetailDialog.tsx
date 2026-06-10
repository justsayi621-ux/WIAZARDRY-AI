import { X, Brain, AlertCircle, CheckCircle2, HelpCircle, Link2, FileVideo, Cpu, Clock, Zap } from "lucide-react";
import { cn, formatConfidence, formatRelative, parseJsonArray } from "@/lib/utils";

interface Scan {
  id: number;
  filename?: string | null;
  mediaUrl?: string | null;
  secondaryUrl?: string | null;
  verdict: string;
  confidenceScore?: number | null;
  engineModel: string;
  anomalies?: string | null;
  categories?: string | null;
  summary?: string | null;
  aiReasoning?: string | null;
  usedCombinedInput?: boolean | null;
  sensitivityLevel: string;
  processingMs?: number | null;
  tokensUsed: number;
  createdAt: string;
  completedAt?: string | null;
}

interface ScanDetailDialogProps {
  scan: Scan;
  onClose: () => void;
  canView: boolean;
}

const VERDICT_CONFIG = {
  ai:      { icon: AlertCircle, color: "text-destructive",  bg: "bg-destructive/10",  border: "border-destructive/30",  label: "AI Synthetic" },
  real:    { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10",  border: "border-emerald-500/30",  label: "Authentic" },
  mixed:   { icon: HelpCircle,  color: "text-amber-400",   bg: "bg-amber-500/10",    border: "border-amber-500/30",    label: "Mixed Signal" },
  unknown: { icon: HelpCircle,  color: "text-muted-foreground", bg: "bg-muted/20",   border: "border-border",          label: "Inconclusive" },
};

const ENGINE_LABELS: Record<string, string> = {
  "gemini-2.5-flash":  "Gemini 2.5 Flash",
  "gemini-2.5-pro":    "Gemini 2.5 Pro",
  "gemini-2.0-ultra":  "Gemini 2.0 Ultra",
  "zak-global":        "ZAK Global Search",
  "wizardry-neural-x": "Wizardry Neural X",
};

export default function ScanDetailDialog({ scan, onClose, canView }: ScanDetailDialogProps) {
  const vc = VERDICT_CONFIG[scan.verdict as keyof typeof VERDICT_CONFIG] ?? VERDICT_CONFIG.unknown;
  const VIcon = vc.icon;
  const anomalies = parseJsonArray(scan.anomalies ?? "");
  const categories = parseJsonArray(scan.categories ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-[#080c18] border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-muted/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center">
              <Brain className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">AI Decision Report</h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{scan.filename || scan.mediaUrl || `Scan #${scan.id}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {!canView ? (
            <div className="flex flex-col items-center gap-4 py-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Brain className="w-8 h-8 text-primary/50" />
              </div>
              <div>
                <p className="font-bold text-foreground">AI Decision History</p>
                <p className="text-sm text-muted-foreground mt-1">Full AI reasoning is available on <span className="text-primary font-semibold">Advanced</span> and <span className="text-primary font-semibold">Enterprise</span> plans.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
                {["Confidence breakdown", "Anomaly timeline", "Chain of reasoning", "Web provenance data"].map((f) => (
                  <span key={f} className="px-2.5 py-1 rounded-full border border-border bg-muted/20">{f}</span>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Verdict banner */}
              <div className={cn("flex items-center gap-3 p-4 rounded-xl border", vc.bg, vc.border)}>
                <VIcon className={cn("w-6 h-6 flex-shrink-0", vc.color)} />
                <div className="flex-1">
                  <div className={cn("font-bold", vc.color)}>{vc.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{scan.summary}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold mono text-foreground">{formatConfidence(scan.confidenceScore)}</div>
                  <div className="text-[10px] text-muted-foreground">confidence</div>
                </div>
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { icon: Cpu, label: "Engine", value: ENGINE_LABELS[scan.engineModel] || scan.engineModel },
                  { icon: Zap, label: "Sensitivity", value: scan.sensitivityLevel },
                  { icon: Clock, label: "Processing", value: scan.processingMs ? `${scan.processingMs}ms` : "—" },
                  { icon: Zap, label: "Tokens Used", value: `${scan.tokensUsed}` },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="bg-muted/20 rounded-lg p-3 border border-border/50">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3 h-3 text-primary" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
                    </div>
                    <div className="text-xs font-semibold text-foreground truncate">{value}</div>
                  </div>
                ))}
              </div>

              {/* Combined input badge */}
              {scan.usedCombinedInput && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500/8 border border-cyan-500/25 text-xs text-cyan-400">
                  <Link2 className="w-3.5 h-3.5 flex-shrink-0" />
                  Combined URL + video analysis — cross-verified from multiple sources
                </div>
              )}

              {/* Sources */}
              {(scan.mediaUrl || scan.filename) && (
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Analyzed Sources</div>
                  <div className="space-y-1.5">
                    {scan.filename && (
                      <div className="flex items-center gap-2 text-xs bg-muted/20 rounded px-3 py-2 border border-border/50">
                        <FileVideo className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                        <span className="truncate text-foreground">{scan.filename}</span>
                        <span className="ml-auto text-muted-foreground">file</span>
                      </div>
                    )}
                    {scan.mediaUrl && (
                      <div className="flex items-center gap-2 text-xs bg-muted/20 rounded px-3 py-2 border border-border/50">
                        <Link2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span className="truncate text-foreground font-mono">{scan.mediaUrl}</span>
                        <span className="ml-auto text-muted-foreground">url</span>
                      </div>
                    )}
                    {scan.secondaryUrl && (
                      <div className="flex items-center gap-2 text-xs bg-muted/20 rounded px-3 py-2 border border-border/50">
                        <Link2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                        <span className="truncate text-foreground font-mono">{scan.secondaryUrl}</span>
                        <span className="ml-auto text-muted-foreground">secondary</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* AI Reasoning */}
              {scan.aiReasoning && (
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">AI Chain-of-Reasoning</div>
                  <div className="bg-muted/15 border border-border/60 rounded-xl p-4 text-xs text-muted-foreground leading-relaxed">
                    {scan.aiReasoning}
                  </div>
                </div>
              )}

              {/* Anomalies */}
              {anomalies.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Detected Anomalies ({anomalies.length})</div>
                  <div className="space-y-1.5">
                    {anomalies.map((a, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-amber-300 bg-amber-500/8 rounded-lg px-3 py-2 border border-amber-500/20">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                        {a}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Manipulation Categories</div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((c, i) => (
                      <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-destructive/15 text-destructive border border-destructive/25 font-medium">{c}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Timestamp */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-3">
                <span>Scanned {formatRelative(scan.createdAt)}</span>
                {scan.completedAt && <span>Completed {formatRelative(scan.completedAt)}</span>}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
