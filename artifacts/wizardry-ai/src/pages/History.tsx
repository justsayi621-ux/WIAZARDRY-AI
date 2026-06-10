import { useState } from "react";
import { History as HistoryIcon, Search, Trash2, ScanLine, Eye, Lock, Play, AlertCircle } from "lucide-react";
import { useListScans, useDeleteScan, useGetCurrentSubscription } from "@workspace/api-client-react";
import { getListScansQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, formatRelative, formatConfidence, parseJsonArray } from "@/lib/utils";
import VerdictBadge from "@/components/VerdictBadge";
import ScanDetailDialog from "@/components/ScanDetailDialog";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "ai", label: "AI Detected" },
  { value: "real", label: "Authentic" },
  { value: "mixed", label: "Mixed" },
];

const TIER_RANK: Record<string, number> = { free: 0, basic: 1, pro: 2, advanced: 3, enterprise: 4 };

export default function History() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [detailScan, setDetailScan] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<{ id: number; url: string } | null>(null);
  const queryClient = useQueryClient();
  const deleteScan = useDeleteScan();
  const { data: subscription } = useGetCurrentSubscription();

  const planId = subscription?.planId || "free";
  const tierRank = TIER_RANK[planId] ?? 0;
  const canViewDecisions = tierRank >= TIER_RANK["advanced"];
  const canLivePreview = tierRank >= TIER_RANK["advanced"];

  const { data: scans, isLoading } = useListScans(
    { filter: filter as "all" | "ai" | "real" | "mixed", search: search || undefined },
    { query: { queryKey: getListScansQueryKey({ filter: filter as never, search: search || undefined }) } }
  );

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    try {
      await deleteScan.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getListScansQueryKey() });
    } finally { setDeletingId(null); }
  };

  const selectedScan = detailScan !== null ? scans?.find((s) => s.id === detailScan) : null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <HistoryIcon className="w-5 h-5 text-primary" />
          Forensic Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">All scan records with full audit trail.</p>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 p-1 rounded-lg bg-muted/30 border border-border">
          {FILTERS.map((f) => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-all", filter === f.value ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground")}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by filename..."
            className="w-full pl-9 pr-4 py-2 bg-input/40 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Paywall notice for decision history */}
      {!canViewDecisions && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/8 border border-primary/20 text-xs text-muted-foreground">
          <Lock className="w-4 h-4 text-primary flex-shrink-0" />
          <span>
            <span className="text-primary font-semibold">AI Decision History & Live Preview</span> — view full AI reasoning, anomaly breakdowns, and live media previews. Available on <span className="text-cyan-400 font-semibold">Advanced</span> and <span className="text-amber-400 font-semibold">Enterprise</span> plans.
          </span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
            Loading scan records...
          </div>
        ) : !scans || scans.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <ScanLine className="w-10 h-10 opacity-25" />
            <p className="text-sm font-medium">No scans found</p>
            <p className="text-xs">{search || filter !== "all" ? "Try adjusting your filters" : "Run your first scan to see history here"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">File</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Verdict</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Confidence</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Engine</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Date</th>
                  <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {scans.map((scan, i) => (
                  <tr key={scan.id} className="hover:bg-muted/15 transition-colors animate-stagger-in" style={{ animationDelay: `${i * 0.04}s` }}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {/* Live preview thumbnail (Advanced+) */}
                        {canLivePreview && scan.mediaUrl ? (
                          <button
                            onClick={() => setPreviewUrl(previewUrl?.id === scan.id ? null : { id: scan.id, url: scan.mediaUrl! })}
                            className="w-9 h-7 rounded bg-black border border-border flex items-center justify-center flex-shrink-0 hover:border-primary/40 transition-colors group"
                          >
                            <Play className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
                          </button>
                        ) : (
                          <div className="w-7 h-7 rounded bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                            <ScanLine className="w-3.5 h-3.5 text-primary" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm text-foreground truncate max-w-[160px]">{scan.filename || scan.mediaUrl || "—"}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="text-[11px] text-muted-foreground mono lg:hidden">{formatRelative(scan.createdAt)}</div>
                            {(scan as unknown as { usedCombinedInput?: boolean }).usedCombinedInput && (
                              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-1.5 rounded">combined</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Inline live preview */}
                      {canLivePreview && previewUrl?.id === scan.id && (
                        <div className="mt-2 rounded-lg overflow-hidden bg-black border border-border max-w-xs">
                          <video src={previewUrl.url} controls autoPlay muted className="w-full max-h-32 object-contain" />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><VerdictBadge verdict={scan.verdict} size="sm" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="mono text-sm font-medium text-foreground">{formatConfidence(scan.confidenceScore)}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground truncate max-w-[120px] block">{scan.engineModel}</span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground mono">{formatRelative(scan.createdAt)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {/* AI Decision button */}
                        <button
                          onClick={() => setDetailScan(detailScan === scan.id ? null : scan.id)}
                          title={canViewDecisions ? "View AI decision report" : "Upgrade to Advanced+ to view"}
                          className={cn(
                            "flex items-center gap-1 text-xs transition-colors",
                            canViewDecisions
                              ? "text-muted-foreground hover:text-primary"
                              : "text-muted-foreground/30 cursor-default"
                          )}
                        >
                          {canViewDecisions ? <Eye className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline text-[11px]">AI</span>
                        </button>
                        <button
                          onClick={() => handleDelete(scan.id)}
                          disabled={deletingId === scan.id}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        >
                          {deletingId === scan.id ? (
                            <div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
                          ) : <Trash2 className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {scans && <p className="text-xs text-muted-foreground text-right">{scans.length} record{scans.length !== 1 ? "s" : ""}</p>}

      {/* AI Decision Dialog */}
      {selectedScan && (
        <ScanDetailDialog
          scan={selectedScan as Parameters<typeof ScanDetailDialog>[0]["scan"]}
          onClose={() => setDetailScan(null)}
          canView={canViewDecisions}
        />
      )}
    </div>
  );
}
