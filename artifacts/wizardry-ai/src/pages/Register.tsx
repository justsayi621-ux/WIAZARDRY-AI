import { useState, useCallback } from "react";
import { Zap, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "@/hooks/useNavigate";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from '@tanstack/react-query';

const GOOGLE_CLIENT_ID = "338137039738-4ubmsjjdlsirsnc3s03hc9in211bv3u3.apps.googleusercontent.com";

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

export default function Register() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ email: "", username: "", displayName: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();
  const { login: authLogin, setWelcomeMessage, setNeedsPasswordSetup, setNeedsOnboarding } = useAuth();

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);
  setSuccessMsg(null);
  if (form.password.length < 8) {
    setError("Password must be at least 8 characters");
    return;
  }
  setLoading(true);
  try {
    const res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Registration failed.");
      return;
    }
    
        authLogin(data.userId);
    setWelcomeMessage(data.message);
    setSuccessMsg(data.message);
    
    // Clear old data caches so the router pulls the fresh onboarding state
    queryClient.clear();
    
    setTimeout(() => {
      window.location.replace("/onboarding");
    }, 1000);
    
  } catch {
    setError("Registration failed. Please try again.");
  } finally {
    setLoading(false);
  }
};

  // Real Google Sign-Up — uses GIS popup
  const handleGoogleSignUp = useCallback(() => {
    setError(null);
    if (!window.google) {
      setError("Google Sign-In failed to load. Please refresh and try again.");
      return;
    }
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: async (tokenResponse) => {
        if (tokenResponse.error) { setError("Google sign-up was cancelled."); return; }
        setGoogleLoading(true);
        try {
          const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          });
          const profile = await profileRes.json();
          const res = await fetch("http://localhost:5000/api/auth/google/signin", {
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
          if (data.needsPasswordSetup) setNeedsPasswordSetup(true);
          if (data.needsOnboarding) setNeedsOnboarding(true);
          setSuccessMsg(data.message);
          setTimeout(() => navigate(data.needsOnboarding ? "/onboarding" : "/dashboard"), 900);
        } catch {
          setError("Google sign-up failed. Please try again.");
        } finally {
          setGoogleLoading(false);
        }
      },
    });
    client.requestAccessToken();
  }, [authLogin, setWelcomeMessage, setNeedsPasswordSetup, setNeedsOnboarding, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-6 animate-fade-in-up">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative w-14 h-14 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center glow-violet">
              <Zap className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Create Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Join Wizardry AI — enterprise-grade deepfake detection</p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-2">
          {/* Real Google sign-up */}
          <button
            onClick={handleGoogleSignUp}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-border bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-foreground disabled:opacity-60"
          >
            <GoogleIcon />
            {googleLoading ? "Signing up..." : "Sign up with Google"}
          </button>

          {/* Apple — disabled, coming soon */}
          <div className="relative group">
            <button
              disabled
              className="w-full flex items-center justify-center gap-3 py-3 rounded-lg border border-border bg-white/5 text-sm font-medium text-muted-foreground opacity-40 cursor-not-allowed"
            >
              <AppleIcon />
              Sign up with Apple
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
              Apple Sign-In coming soon
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or sign up with email</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-sm text-emerald-400 animate-fade-in-up">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: "displayName", label: "Display Name", type: "text", placeholder: "Full name" },
            { key: "username", label: "Username", type: "text", placeholder: "unique_handle (3-20 chars)" },
            { key: "email", label: "Email", type: "email", placeholder: "you@domain.com" },
          ].map(({ key, label, type, placeholder }) => (
            <div key={key} className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={update(key)}
                placeholder={placeholder}
                required
                className="w-full bg-input/40 border border-border rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>
          ))}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={form.password}
                onChange={update("password")}
                placeholder="Min 8 characters"
                required
                className="w-full bg-input/40 border border-border rounded-lg px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/25 text-xs text-destructive animate-fade-in-up">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors glow-violet disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : "Create Account"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="text-primary hover:text-primary/80 font-semibold transition-colors">Sign in</button>
        </p>
      </div>
    </div>
  );
}