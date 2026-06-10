import { useState } from "react";
import { Zap, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "@/hooks/useNavigate";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!email.trim()) return;
  setLoading(true);
  setError(null);
  try {
    // Prefixing the URL with the environment variable
    const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to process request.");
      return;
    }
    setSent(true);
  } catch {
    setError("Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in-up">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative w-14 h-14 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center glow-violet">
              <Zap className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Enter your email to receive a reset link</p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-sm text-emerald-400">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Reset link sent!</p>
                <p className="text-xs mt-1 text-emerald-400/80">Check your email at <strong>{email}</strong>. The link expires in 1 hour.</p>
              </div>
            </div>
            <button onClick={() => navigate("/login")} className="w-full py-3 rounded-lg bg-muted/30 border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
                className="w-full bg-input/40 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                placeholder="your@email.com"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
              </div>
            )}

            <button type="submit" disabled={loading || !email.trim()}
              className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 glow-violet">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </span>
              ) : "Send Reset Link"}
            </button>

            <button type="button" onClick={() => navigate("/login")}
              className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Sign In
            </button>
          </form>
        )}
      </div>
    </div>
  );
}