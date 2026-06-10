import { useState } from "react";
import { User, Activity, ShieldCheck, HelpCircle, Zap, Star, Check, LogOut, CheckCircle2 } from "lucide-react";
import { useGetMe, useGetScanStats, useGetTokenBalance, useGetCurrentSubscription, useGetScorecard, useGetPlans } from "@workspace/api-client-react";
import { getGreeting, tokensToScans } from "@/lib/utils";
import ScoreGauge, { MiniScoreRing } from "@/components/ScoreGauge";
import TokenWidget from "@/components/TokenWidget";
import UpgradeModal from "@/components/UpgradeModal";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@/hooks/useNavigate";
import PasswordUpdateModal from "@/components/PasswordUpdateModal";

const TIER_COLORS: Record<string, string> = {
  free: "text-slate-400 border-slate-400/30 bg-slate-400/10",
  basic: "text-blue-400 border-blue-400/30 bg-blue-400/10",
  pro: "text-violet-400 border-violet-400/30 bg-violet-400/10",
  advanced: "text-cyan-400 border-cyan-400/30 bg-cyan-400/10",
  enterprise: "text-amber-400 border-amber-400/30 bg-amber-400/10",
};

interface Plan {
  id: string;
  name: string;
  price: number;
  tokenLimit: number | null;
  features: string[];
  recommended: boolean;
}

function PlanCard({ plan, current, onUpgrade }: { plan: Plan; current: boolean; onUpgrade: (plan: Plan) => void }) {
  return (
    <div className={cn("rounded-lg border p-5 space-y-4 relative flex flex-col",
      plan.recommended ? "border-primary/50 bg-primary/5" : "border-border bg-card",
      current && "ring-1 ring-primary/30"
    )}>
      {plan.recommended && (
        <div className="absolute -top-2.5 left-4">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary text-white tracking-wider uppercase">Recommended</span>
        </div>
      )}
      <div>
        <h3 className="font-bold text-foreground">{plan.name}</h3>
        <div className="mt-1.5 flex items-baseline gap-1">
          <span className="text-2xl font-bold mono text-foreground">${plan.price}</span>
          <span className="text-xs text-muted-foreground">/month</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1 mono">
          {plan.tokenLimit === null ? "Unlimited tokens" : `${plan.tokenLimit.toLocaleString()} tokens · ${tokensToScans(plan.tokenLimit)}`}
        </div>
      </div>
      <ul className="space-y-2 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
            {f}
          </li>
        ))}
      </ul>
      {current ? (
        <div className="w-full py-2.5 rounded-md bg-primary/10 border border-primary/25 text-primary text-xs font-bold text-center">Current Plan</div>
      ) : (
        <button
          onClick={() => onUpgrade(plan)}
          className={cn("w-full py-2.5 rounded-md text-xs font-bold transition-all border",
            plan.recommended ? "bg-primary text-white border-primary hover:bg-primary/90 glow-violet" : "bg-muted/30 text-foreground border-border hover:border-primary/40 hover:text-primary"
          )}
        >
          {plan.price === 0 ? "Downgrade" : "Upgrade"}
        </button>
      )}
    </div>
  );
}

export default function Profile() {
  const [upgradePlan, setUpgradePlan] = useState<Plan | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const { data: user } = useGetMe();
  const { data: stats } = useGetScanStats();
  const { data: balance } = useGetTokenBalance();
  const { data: subscription } = useGetCurrentSubscription();
  const { data: scorecard } = useGetScorecard();
  const { data: plans } = useGetPlans();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/auth/logout", { method: "POST", headers: { "x-user-id": String(user?.id ?? 1) } });
    } catch {}
    logout();
    navigate("/login");
  };

  const handleUpgrade = (plan: Plan) => {
    setUpgradePlan(plan);
  };

  const handlePasswordSave = async (password: string) => {
    const res = await fetch("/api/auth/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": String(user?.id ?? 1) },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) { const d = await res.json(); throw { data: d }; }
    setSuccessMsg("Password updated successfully!");
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <User className="w-5 h-5 text-primary" />
            Identity & Billing Vault
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {getGreeting()}, <span className="text-foreground font-medium">{user?.displayName || user?.username || "Agent"}</span>.
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-sm text-emerald-400 animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {successMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center">
              {(user as unknown as { avatarUrl?: string })?.avatarUrl ? (
                <img src={(user as unknown as { avatarUrl?: string }).avatarUrl} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-primary">{user?.username?.[0]?.toUpperCase() || "W"}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-foreground truncate">{user?.displayName || user?.username}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <div className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border inline-block", TIER_COLORS[user?.tier || "free"])}>
                  {user?.tier || "free"} tier
                </div>
                {(user as unknown as { authMethod?: string })?.authMethod === "google" && (
                  <span className="text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">Google</span>
                )}
              </div>
            </div>
          </div>

          {/* Account actions */}
          <div className="space-y-2">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full text-xs text-muted-foreground border border-border rounded-md px-3 py-2 hover:text-foreground hover:border-primary/30 transition-colors text-left"
            >
              {(user as unknown as { needsPasswordSetup?: boolean })?.needsPasswordSetup
                ? "⚠️ Set your password (Google account)"
                : "Change password"
              }
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Activity, label: "Total Scans", value: stats?.total ?? 0, color: "text-cyan-400" },
              { icon: ShieldCheck, label: "AI Detected", value: stats?.aiDetected ?? 0, color: "text-destructive" },
              { icon: Star, label: "Authentic", value: stats?.authentic ?? 0, color: "text-emerald-400" },
              { icon: HelpCircle, label: "Uncertain", value: (stats?.uncertain ?? 0) + (stats?.mixed ?? 0), color: "text-amber-400" },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="bg-muted/20 rounded-md p-3 border border-border/50">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={cn("w-3 h-3", color)} />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
                <div className={cn("text-xl font-bold mono", color)}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scorecard */}
        {scorecard && (
          <div className="rounded-lg border border-border bg-card p-5 space-y-5">
            <h2 className="text-sm font-bold text-foreground">Intelligence Scorecard</h2>
            <div className="flex justify-center">
              <ScoreGauge score={scorecard.overallScore} label="Overall Score" size={110} />
            </div>
            <div className="flex justify-around">
              <MiniScoreRing score={scorecard.trustScore} label="Trust" color="#7c3aed" />
              <MiniScoreRing score={scorecard.accuracyScore} label="Accuracy" color="#06b6d4" />
              <MiniScoreRing score={scorecard.activityScore} label="Activity" color="#22c55e" />
            </div>
            {(scorecard.suggestions ?? []).slice(0, 2).map((s, i) => (
              <p key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                <Zap className="w-3 h-3 text-primary shrink-0 mt-0.5" />{s}
              </p>
            ))}
          </div>
        )}

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
      </div>

      {/* Subscription Plans */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-4">Subscription Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {(plans || []).map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan as Plan}
              current={subscription?.planId === plan.id || (plan.id === "free" && !subscription)}
              onUpgrade={handleUpgrade}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4">
          Token rate: <span className="mono text-primary font-semibold">5 tokens per scan round</span>. Free plan = 1 scan total. Tokens reset monthly.
        </p>
      </div>

      {upgradePlan && (
        <UpgradeModal
          plan={upgradePlan}
          onClose={() => {
            setUpgradePlan(null);
          }}
          onSuccess={(msg: string) => {
            setSuccessMsg(msg);
            setTimeout(() => setSuccessMsg(null), 4000);
          }}
        />
      )}

      {showPasswordModal && (
        <PasswordUpdateModal
          displayName={user?.displayName || user?.username}
          isNewUser={false}
          onClose={() => setShowPasswordModal(false)}
          onSave={handlePasswordSave}
        />
      )}
    </div>
  );
}
