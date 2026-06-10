import { cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Zap } from "lucide-react";
import { useNavigate } from "@/hooks/useNavigate";

interface Props {
  tokenLimit: number | null;
  tokensUsed: number;
  tokensRemaining: number | null;
  isExhausted: boolean;
  isNearLimit: boolean;
  planId: string;
  compact?: boolean;
}

export default function TokenWidget({ tokenLimit, tokensUsed, tokensRemaining, isExhausted, isNearLimit, planId, compact = false }: Props) {
  const pct = tokenLimit ? Math.min(100, (tokensUsed / tokenLimit) * 100) : 0;
  const navigate = useNavigate();

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-xs", isExhausted ? "text-destructive" : isNearLimit ? "text-amber-400" : "text-muted-foreground")}>
        <Zap className="w-3 h-3" />
        <span className="mono">
          {tokenLimit === null ? "Unlimited" : `${tokensRemaining ?? 0} / ${tokenLimit}`}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border p-4 space-y-3", isExhausted ? "border-destructive/40 bg-destructive/5" : isNearLimit ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-card")}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className={cn("w-4 h-4", isExhausted ? "text-destructive" : isNearLimit ? "text-amber-400" : "text-primary")} />
          <span className="text-sm font-medium">Token Balance</span>
        </div>
        <span className={cn("text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded", isExhausted ? "bg-destructive/15 text-destructive" : isNearLimit ? "bg-amber-500/15 text-amber-400" : "bg-primary/15 text-primary")}>
          {planId}
        </span>
      </div>

      {tokenLimit !== null && (
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all duration-500", isExhausted ? "bg-destructive" : isNearLimit ? "bg-amber-500" : "bg-primary")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground mono">
            <span>{tokensUsed} used</span>
            <span>{tokensRemaining ?? 0} remaining / {tokenLimit} total</span>
          </div>
        </div>
      )}

      {tokenLimit === null && (
        <div className="text-sm text-cyan-400 font-medium mono">Unlimited tokens</div>
      )}

      {isExhausted && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
          <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-destructive">Token limit reached</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Upgrade your plan to continue scanning.</p>
          </div>
        </div>
      )}

      {isNearLimit && !isExhausted && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/30">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-400">Running low</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{tokensRemaining} tokens remaining. Consider upgrading.</p>
          </div>
        </div>
      )}

      {(isExhausted || isNearLimit) && (
        <button
          onClick={() => navigate("/profile")}
          className="w-full text-xs font-semibold py-2 rounded-md bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 transition-colors"
        >
          Upgrade Plan
        </button>
      )}
    </div>
  );
}
