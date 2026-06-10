import { useState } from "react";
import { Shield, X, CheckCircle2, AlertCircle, Copy, ExternalLink } from "lucide-react";

interface TwoFactorSetupModalProps {
  onClose: () => void;
  onSetup: () => Promise<{ secret: string; backupCodes: string[]; otpauthUrl?: string; instructions?: string }>;
  onVerify: (otp: string) => Promise<void>;
}

export default function TwoFactorSetupModal({ onClose, onSetup, onVerify }: TwoFactorSetupModalProps) {
  const [step, setStep] = useState<"init" | "verify" | "done">("init");
  const [secret, setSecret] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await onSetup();
      setSecret(data.secret);
      setBackupCodes(data.backupCodes);
      setStep("verify");
    } catch {
      setError("Setup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) { setError("Enter the 6-digit code from your authenticator app"); return; }
    setLoading(true);
    setError(null);
    try {
      await onVerify(otp);
      setStep("done");
    } catch (e: unknown) {
      setError((e as { data?: { error?: string } })?.data?.error ?? "Invalid code. Codes expire every 30 seconds — try again.");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#080c18] border border-primary/30 rounded-2xl shadow-2xl">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <h2 className="text-sm font-bold text-foreground">Two-Factor Authentication</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {step === "init" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Protect your account with a second verification step. You'll need an authenticator app to generate time-based codes.
              </p>
              <div className="space-y-2 text-xs text-muted-foreground">
                {[
                  "Install Google Authenticator or Authy on your phone",
                  "Scan the QR code or enter the secret key manually",
                  "Enter the 6-digit code to confirm setup",
                ].map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    {s}
                  </div>
                ))}
              </div>
              <a
                href="https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                Download Google Authenticator
              </a>
              {error && <div className="text-xs text-destructive bg-destructive/10 border border-destructive/25 rounded-lg px-3 py-2">{error}</div>}
              <button
                onClick={handleSetup}
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Generating secret..." : "Set Up 2FA"}
              </button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Secret Key</label>
                <div className="flex items-center gap-2 bg-muted/20 rounded-lg px-3 py-2 border border-border">
                  <code className="flex-1 text-xs font-mono text-primary break-all">{secret}</code>
                  <button onClick={copySecret} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
                    {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Open your authenticator app, tap the + button, choose "Enter setup key", and paste this secret. Then enter the 6-digit code it generates below.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">6-Digit Verification Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(null); }}
                  placeholder="000000"
                  autoFocus
                  className="w-full bg-input/40 border border-border rounded-lg px-4 py-3 text-sm font-mono text-center text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary tracking-widest text-lg"
                />
              </div>

              {backupCodes.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Backup Codes</label>
                  <div className="grid grid-cols-2 gap-1 p-3 bg-muted/15 rounded-lg border border-border text-[11px] font-mono text-muted-foreground">
                    {backupCodes.map((c) => <span key={c}>{c}</span>)}
                  </div>
                  <p className="text-[11px] text-amber-400">⚠ Save these codes somewhere safe. Each can only be used once if you lose access to your authenticator.</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/25 rounded-lg px-3 py-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
                </div>
              )}

              <button
                onClick={handleVerify}
                disabled={loading || otp.length !== 6}
                className="w-full py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Enable 2FA"}
              </button>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
              <div>
                <p className="font-bold text-emerald-400">2FA Enabled!</p>
                <p className="text-xs text-muted-foreground mt-1">Your account is now protected. You'll need your authenticator app each time you sign in.</p>
              </div>
              <button onClick={onClose} className="px-6 py-2.5 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors">Done</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}