import { useState } from "react";
import { X, CreditCard, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpgradeSubscription } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentSubscriptionQueryKey, getGetTokenBalanceQueryKey } from "@workspace/api-client-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  tokenLimit: number | null;
}

interface Props {
  plan: Plan;
  onClose: () => void;
  onSuccess?: (msg: string) => void;
}

export default function UpgradeModal({ plan, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<"confirm" | "processing" | "success">("confirm");
  const upgrade = useUpgradeSubscription();
  const queryClient = useQueryClient();

  const handleConfirm = async () => {
    setStep("processing");
    try {
      const res = await upgrade.mutateAsync({ data: { planId: plan.id } });
      queryClient.invalidateQueries({ queryKey: getGetCurrentSubscriptionQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetTokenBalanceQueryKey() });
      setStep("success");
      const msg = (res as unknown as { message?: string })?.message ?? `Successfully upgraded to ${plan.name}!`;
      onSuccess?.(msg);
    } catch {
      setStep("confirm");
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 rounded-xl border border-border bg-card shadow-2xl animate-fade-in-up">
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>

        {step === "confirm" && (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground">Purchase {plan.name}</h3>
                <p className="text-xs text-muted-foreground">Token pack checkout</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/30 border border-border p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{plan.name} Plan</span>
                <span className="font-semibold mono">${plan.price}/mo</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tokens</span>
                <span className="mono text-cyan-400">{plan.tokenLimit === null ? "Unlimited" : `${plan.tokenLimit.toLocaleString()}/mo`}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between font-bold">
                <span>Total today</span>
                <span className="mono">${plan.price}.00</span>
              </div>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-400">
              This checkout is wired to the billing API. Connect a live PayPal gateway to make it settle real funds.
            </div>
            <button
              onClick={handleConfirm}
              className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors glow-violet"
            >
              Confirm Purchase
            </button>
          </div>
        )}

        {step === "processing" && (
          <div className="p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground">Processing purchase...</p>
          </div>
        )}

        {step === "success" && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center animate-verdict-reveal">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-foreground">Upgraded to {plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">Your new tokens are available immediately.</p>
            </div>
            <button onClick={onClose} className="mt-2 px-6 py-2 rounded-md bg-primary/15 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/25 transition-colors">
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
