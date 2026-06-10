import { Lock } from "lucide-react";
import { useNavigate } from "@/hooks/useNavigate";

interface Props {
  requiredTier?: string;
}

export default function PaywallOverlay({ requiredTier = "Enterprise" }: Props) {
  const navigate = useNavigate();
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-lg" style={{ backdropFilter: "blur(8px)", background: "hsla(230,25%,6%,0.85)" }}>
      <div className="flex flex-col items-center gap-5 p-8 rounded-xl border border-primary/20 bg-card/80 max-w-sm w-full mx-4 text-center shadow-xl">
        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">{requiredTier} Tier Required</h3>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            This feature is locked behind the {requiredTier} plan. Upgrade to unlock API key management, webhook endpoints, and direct API integration.
          </p>
        </div>
        <button
          onClick={() => navigate("/profile")}
          className="w-full py-2.5 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors glow-violet"
        >
          Upgrade to {requiredTier}
        </button>
        <p className="text-[11px] text-muted-foreground">$149/mo · Unlimited tokens · Full API access</p>
      </div>
    </div>
  );
}
