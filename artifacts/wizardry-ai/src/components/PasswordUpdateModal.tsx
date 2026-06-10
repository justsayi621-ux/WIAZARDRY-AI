import { useState } from "react";
import { Shield, Eye, EyeOff, CheckCircle2, AlertCircle, X } from "lucide-react";

interface PasswordUpdateModalProps {
  displayName?: string;
  isNewUser?: boolean;
  onClose: () => void;
  onSave: (password: string) => Promise<void>;
}

export default function PasswordUpdateModal({ displayName, isNewUser = false, onClose, onSave }: PasswordUpdateModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const strength = password.length === 0 ? 0 : password.length < 8 ? 1 : password.length < 12 ? 2 : /[A-Z]/.test(password) && /[0-9]/.test(password) && /[^a-zA-Z0-9]/.test(password) ? 4 : 3;
  const strengthLabels = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = ["", "bg-destructive", "bg-amber-400", "bg-emerald-400", "bg-emerald-500"];

  const handleSave = async () => {
    setError(null);
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setSaving(true);
    try {
      await onSave(password);
      setDone(true);
      setTimeout(onClose, 1500);
    } catch (e: unknown) {
      setError((e as { data?: { error?: string } })?.data?.error ?? "Failed to update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#080c18] border border-primary/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Set Your Password</h2>
                <p className="text-xs text-muted-foreground">Secure your account</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Warning banner */}
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-500/8 border border-amber-500/25">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200 leading-relaxed">
              <span className="font-bold">
                {isNewUser ? `Welcome, ${displayName}! ` : "Action required: "}
              </span>
              You signed in with Google but haven't set a password yet. <strong>Without a password, you won't be able to sign in with email on your next session.</strong> Set one now to keep access.
            </div>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              <p className="text-sm font-bold text-emerald-400">Password set successfully!</p>
              <p className="text-xs text-muted-foreground">You can now sign in with email + password or Google.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 8 characters"
                    className="w-full bg-input/40 border border-border rounded-lg px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= strength ? strengthColors[strength] : "bg-muted/30"}`} />
                      ))}
                    </div>
                    <p className={`text-[11px] font-medium ${strength < 2 ? "text-destructive" : strength < 3 ? "text-amber-400" : "text-emerald-400"}`}>
                      {strengthLabels[strength]}
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirm Password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full bg-input/40 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs text-destructive">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors">
                  Remind me later
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !password || !confirm}
                  className="flex-1 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {saving ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : "Set Password"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
