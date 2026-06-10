import { LayoutDashboard, ScanLine, ShieldCheck, HelpCircle, Zap, TrendingUp, Activity, Target } from "lucide-react";
import { useGetDashboardStats, useGetRecentScans, useGetScorecard, useGetTokenBalance } from "@workspace/api-client-react";
import { formatRelative, formatConfidence } from "@/lib/utils";
import VerdictBadge from "@/components/VerdictBadge";
import ScoreGauge, { MiniScoreRing } from "@/components/ScoreGauge";
import TokenWidget from "@/components/TokenWidget";
import { useNavigate } from "@/hooks/useNavigate";
import { getGreeting } from "@/lib/utils";
import { useGetMe } from "@workspace/api-client-react";

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 hover-elevate transition-all animate-fade-in-up">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</span>
        <div className={`w-8 h-8 rounded-md bg-current/10 flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className={`text-2xl font-bold mono ${color}`}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats } = useGetDashboardStats();
  const { data: recent } = useGetRecentScans();
  const { data: scorecard } = useGetScorecard();
  const { data: balance } = useGetTokenBalance();
  const { data: user } = useGetMe();
  const navigate = useNavigate();

  const detectionRate = stats?.detectionRate != null ? `${stats.detectionRate.toFixed(1)}%` : "—";

  return (
    <div className="space-y-6">
      {/* Header with greeting */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <LayoutDashboard className="w-5 h-5 text-primary" />
            Mission Control
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {getGreeting()}, <span className="text-foreground font-medium">{user?.displayName || user?.username || "Agent"}</span>. Ready to verify media today?
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-md bg-primary/15 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/25 transition-colors"
        >
          <ScanLine className="w-4 h-4" />
          New Scan
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Total Scans" value={stats?.totalScans ?? 0} sub={`${stats?.scansToday ?? 0} today`} color="text-cyan-400" />
        <StatCard icon={ShieldCheck} label="AI Detected" value={stats?.aiDetected ?? 0} sub={`${detectionRate} detection rate`} color="text-destructive" />
        <StatCard icon={Target} label="Authentic" value={stats?.authentic ?? 0} sub="Verified real media" color="text-emerald-400" />
        <StatCard icon={HelpCircle} label="Uncertain" value={(stats?.uncertain ?? 0) + (stats?.mixed ?? 0)} sub="Needs review" color="text-amber-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scorecard */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-5">
          <h2 className="text-sm font-semibold text-foreground">Intelligence Scorecard</h2>
          {scorecard ? (
            <div className="space-y-5">
              <div className="flex justify-center">
                <ScoreGauge score={scorecard.overallScore} label="Overall Score" size={130} />
              </div>
              <div className="flex justify-around">
                <MiniScoreRing score={scorecard.trustScore} label="Trust" color="#7c3aed" />
                <MiniScoreRing score={scorecard.accuracyScore} label="Accuracy" color="#06b6d4" />
                <MiniScoreRing score={scorecard.activityScore} label="Activity" color="#22c55e" />
              </div>
              {(scorecard.streak ?? 0) > 0 && (
                <div className="flex items-center justify-center gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-md py-2 border border-amber-500/20">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="font-semibold">{scorecard.streak} day scan streak</span>
                </div>
              )}
              {(scorecard.insights ?? []).slice(0, 2).map((ins, i) => (
                <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5 shrink-0">•</span>
                  {ins}
                </p>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
              <Activity className="w-8 h-8 opacity-30" />
              <p className="text-xs text-center">Run your first scan to build your scorecard</p>
            </div>
          )}
        </div>

        {/* Recent Scans */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Recent Scans</h2>
            <button onClick={() => navigate("/history")} className="text-xs text-primary hover:text-primary/80 transition-colors">View all</button>
          </div>

          {!recent || recent.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
              <ScanLine className="w-8 h-8 opacity-30" />
              <p className="text-xs">No scans yet. Start your first analysis.</p>
              <button onClick={() => navigate("/")} className="text-xs px-4 py-2 rounded-md bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors">
                Run a Scan
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {recent.map((scan, i) => (
                <div
                  key={scan.id}
                  className="flex items-center gap-3 p-3 rounded-md bg-muted/20 hover:bg-muted/30 transition-colors border border-transparent hover:border-border animate-stagger-in"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <ScanLine className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground truncate font-medium">{scan.filename || scan.mediaUrl || "Media"}</div>
                    <div className="text-[11px] text-muted-foreground mono">{formatRelative(scan.createdAt)}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <VerdictBadge verdict={scan.verdict} size="sm" />
                    <span className="text-[10px] text-muted-foreground mono">{formatConfidence(scan.confidenceScore)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Token Widget */}
      {balance && (
        <TokenWidget
          tokenLimit={balance.tokenLimit ?? null}
          tokensUsed={balance.tokensUsed}
          tokensRemaining={balance.tokensRemaining ?? null}
          isExhausted={balance.isExhausted ?? false}
          isNearLimit={balance.isNearLimit ?? false}
          planId={balance.planId}
        />
      )}

      {/* Engine & Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Top Engine</div>
            <div className="text-sm font-medium text-foreground">{stats.topEngine || "—"}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Avg Confidence</div>
            <div className="text-sm font-bold mono text-cyan-400">{formatConfidence(stats.avgConfidenceScore)}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Detection Rate</div>
            <div className="text-sm font-bold mono text-destructive">{detectionRate}</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Scans Today</div>
            <div className="text-sm font-bold mono text-primary">{stats.scansToday}</div>
          </div>
        </div>
      )}
    </div>
  );
}
