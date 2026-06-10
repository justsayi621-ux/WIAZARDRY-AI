import { useState, useEffect } from "react";
import { Zap, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useNavigate } from "@/hooks/useNavigate";

export default function ResetPassword() {
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("token");
    if (t) setToken(t);
    else setError("Invalid reset link. Please request a new one.");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError("Passwords do not match"); return; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      setDone(true);
      setTimeout(() => navigate("/login"), 2000);
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
          <h1 className="text-2xl font-bold text-foreground">New Password</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose a strong password for your account</p>
        </div>

        {done ? (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-sm text-emerald-400">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Password reset successfully!</p>
              <p className="text-xs mt-1 text-emerald-400/80">Redirecting you to sign in...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} required autoFocus
                  className="w-full bg-input/40 border border-border rounded-lg px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Minimum 8 characters"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirm Password</label>
              <input
                type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                className="w-full bg-input/40 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="Repeat your password"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{error}
              </div>
            )}

            <button type="submit" disabled={loading || !password || !confirm || !token}
              className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 glow-violet">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Resetting...
                </span>
              ) : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}