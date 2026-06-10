import { useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from "react";
import { Zap, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "@/hooks/useNavigate";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }) => { requestAccessToken: () => void };
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = "338137039738-4ubmsjjdlsirsnc3s03hc9in211bv3u3.apps.googleusercontent.com";

type Step = "email" | "password" | "two_factor" | "google_only" | "apple_only" | "not_found";

interface EmailCheckResult {
  exists: boolean;
  authMethod?: string;
  hasGoogle?: boolean;
  displayName?: string;
}

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.56-1.32 3.1-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

export default function Login() {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [emailCheck, setEmailCheck] = useState<EmailCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const navigate = useNavigate();
  const { login: authLogin, setWelcomeMessage, setNeedsPasswordSetup, setNeedsOnboarding } = useAuth();

 const checkEmail = useCallback(async () => {
  if (!email.trim()) return;
  setChecking(true);
  setError(null);
  try {
    // Added environment variable prefix here
    const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/check-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase().trim() }),
    });
    
    if (!res.ok) throw new Error();

    const data: EmailCheckResult = await res.json();
    setEmailCheck(data);
    if (!data.exists) setStep("not_found");
    else if (data.authMethod === "google" && !data.hasGoogle) setStep("google_only");
    else if (data.authMethod === "apple") setStep("apple_only");
    else setStep("password");
  } catch {
    setError("Could not verify email. Please try again.");
  } finally {
    setChecking(false);
  }
}, [email]);

// Direct login via /auth/login — sets sessionToken properly
const handleLogin = useCallback(async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setLoggingIn(true);
  try {
    // Added environment variable prefix here
    const res = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.toLowerCase().trim(), password, ...(step === "two_factor" ? { otp } : {}) }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Invalid credentials.");
      if (data.hint === "two_factor_required" || data.needsTwoFactor) {
        setStep("two_factor");
      }
      if (data.hint === "use_google") setStep("google_only");
      else if (data.hint === "register") setStep("not_found");
      return;
    }
    // data.userId is the real user ID from DB
    
    // data.userId is the real user ID from DB
    authLogin(data.userId);
    setWelcomeMessage(data.message ?? `Welcome back, ${data.displayName}!`);
    
    // Clear old data caches so the router pulls the fresh onboarding state
    queryClient.clear();

    if (data.needsPasswordSetup) setNeedsPasswordSetup(true);
    if (data.needsOnboarding) setNeedsOnboarding(true);
    setSuccessMsg(data.message ?? "Welcome back!");
    
    setTimeout(() => {
      if (data.needsOnboarding) {
        window.location.replace("/onboarding");
      } else {
        navigate("/dashboard");
      }
    }, 800);

  } catch {
    setError("Login failed. Please try again.");
  } finally {
    setLoggingIn(false);
  }
}, [email, password, otp, step, authLogin, setWelcomeMessage, setNeedsPasswordSetup, setNeedsOnboarding, navigate]);

  const handleGoogleSignIn = useCallback(() => {
    setError(null);
    if (!window.google) {
      setError("Google Sign-In failed to load. Please refresh and try again.");
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          setError("Google sign-in was cancelled or failed.");
          return;
        }
        setChecking(true);
        try {
          const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          });
          const profile = await profileRes.json();
          const res = await fetch("/api/auth/google/signin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              googleId: profile.sub,
              email: profile.email,
              displayName: profile.name ?? profile.email.split("@")[0],
              avatarUrl: profile.picture,
              googleAccessToken: tokenResponse.access_token,
            }),
          });
          const data = await res.json();
          if (!res.ok) { setError(data.error); return; }
         
    authLogin(data.userId);
    setWelcomeMessage(data.message);
    
    // Clear old data caches for Google sign-in too
    queryClient.clear();

    if (data.needsPasswordSetup) setNeedsPasswordSetup(true);
    if (data.needsOnboarding) setNeedsOnboarding(true);
    setSuccessMsg(data.message);
    
    setTimeout(() => {
      if (data.needsOnboarding) {
        window.location.replace("/onboarding");
      } else {
        navigate("/dashboard");
      }
    }, 900);

        } catch {
          setError("Google sign-in failed. Please try again.");
        } finally {
          setChecking(false);
        }
      },
    });
    client.requestAccessToken();
  }, [authLogin, setWelcomeMessage, setNeedsPasswordSetup, setNeedsOnboarding, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative w-14 h-14 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center glow-violet">
              <Zap className="w-7 h-7 text-primary" />
              <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Wizardry AI</h1>
          <p className="text-sm text-muted-foreground mt-1">Enterprise Deepfake Detection Platform</p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleGoogleSignIn}
            disabled={checking || loggingIn}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-border bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-foreground disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Apple — disabled, coming soon */}
          <div className="relative group">
            <button
              disabled
              className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-border bg-white/5 text-sm font-medium text-muted-foreground opacity-40 cursor-not-allowed"
            >
              <AppleIcon />
              Continue with Apple
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Apple Sign-In coming soon
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or sign in with email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-sm text-emerald-400 animate-fade-in-up">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        <form onSubmit={step === "password" ? handleLogin : (e) => { e.preventDefault(); checkEmail(); }} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStep("email"); setEmailCheck(null); setError(null); setSuccessMsg(null); }}
              required
              autoComplete="email"
              placeholder="you@domain.com"
              className="w-full bg-input/40 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            />
          </div>

          {step === "password" && (
            <div className="space-y-1.5 animate-fade-in-up">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
                {emailCheck?.displayName && (
                  <span className="text-xs text-emerald-400 font-medium">Welcome back, {emailCheck.displayName}!</span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  required
                  autoComplete="current-password"
                  className="w-full bg-input/40 border border-border rounded-lg px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>
          )}

          {step === "two_factor" && (
            <div className="space-y-1.5 animate-fade-in-up">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">2FA Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                autoFocus
                placeholder="000000"
                className="w-full bg-input/40 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors tracking-widest text-center"
              />
              <p className="text-[11px] text-muted-foreground">
                Enter the 6-digit code from your authenticator app.
              </p>
            </div>
          )}

          {step === "google_only" && (
            <div className="p-3 rounded-lg bg-primary/8 border border-primary/25 text-xs text-primary animate-fade-in-up">
              This account uses Google Sign-In. Use the "Continue with Google" button above.
            </div>
          )}

          {step === "apple_only" && (
            <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground animate-fade-in-up">
              This account uses Apple Sign-In — coming soon. Contact support for access.
            </div>
          )}

          {step === "not_found" && (
            <div className="p-3 rounded-lg bg-muted/20 border border-border text-xs text-muted-foreground animate-fade-in-up">
              No account found with this email.{" "}
              <button type="button" onClick={() => navigate("/register")} className="text-primary font-semibold hover:underline">Create one →</button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs text-destructive animate-fade-in-up">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loggingIn || checking || step === "google_only" || step === "not_found" || step === "apple_only" || (step === "two_factor" && otp.length !== 6)}
            className={cn(
              "w-full py-3 rounded-lg font-semibold text-sm transition-colors disabled:opacity-60",
              step === "password" || step === "two_factor"
                ? "bg-primary text-white hover:bg-primary/90 glow-violet"
                : "bg-muted/30 border border-border text-foreground hover:bg-muted/50"
            )}
          >
            {loggingIn || checking ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                {checking ? "Checking..." : "Signing in..."}
              </span>
            ) : step === "two_factor" ? "Verify & Sign In" : step === "password" ? "Sign In" : step === "email" ? "Continue →" : "Check Email"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          No account?{" "}
          <button onClick={() => navigate("/register")} className="text-primary hover:text-primary/80 font-semibold transition-colors">
            Create one
          </button>
        </p>
      </div>
    </div>
  );
}