import { useEffect } from "react";
import { useLocation, Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NavSidebar from "@/components/NavSidebar";
import Scanner from "@/pages/Scanner";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Notifications from "@/pages/Notifications";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import ApiKeys from "@/pages/ApiKeys";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "./pages/forgot-password";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/onboarding";
import NotFound from "@/pages/not-found";
import { useGetMe, useGetCurrentSubscription } from "@workspace/api-client-react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import PasswordUpdateModal from "@/components/PasswordUpdateModal";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

// These routes are accessible without login
const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email"];

function AppShell() {
  const [location] = useLocation();
  const { isAuthenticated, userId, needsPasswordSetup, setNeedsPasswordSetup, welcomeMessage, setWelcomeMessage } = useAuth();

  const isPublic = PUBLIC_ROUTES.some((r) => location.startsWith(r));
  const { data: user, isLoading: isUserLoading } = useGetMe();
  const { data: subscription } = useGetCurrentSubscription();

  // Auth guard — redirect unauthenticated users to login
  useEffect(() => {
    if (!isAuthenticated && !isPublic) {
      window.location.replace("/login");
    }
  }, [isAuthenticated, isPublic]);

  // Redirect authenticated users away from auth pages
  useEffect(() => {
    if (isAuthenticated && (location === "/login" || location === "/register")) {
      window.location.replace("/dashboard");
    }
  }, [isAuthenticated, location]);

  const handlePasswordSave = async (password: string) => {
    const res = await fetch("/api/auth/update-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": String(userId ?? 0) },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const d = await res.json();
      throw { data: d };
    }
    setNeedsPasswordSetup(false);
  };

  // Show public routes (login, register, forgot-password, reset-password)
  if (isPublic) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Block rendering until authentication credentials and profile load cleanly
  if (!isAuthenticated || isUserLoading) return null;

  // Derived State: Match directly with the computed flag your backend sends
  const rawUser = user as any;
  const userNeedsOnboarding = rawUser && (
    rawUser.needsOnboarding === true ||
    rawUser.needs_onboarding === true ||
    rawUser.onboardingCompleted === false ||
    rawUser.onboarding_completed === false
  );

  if (userNeedsOnboarding) {
    if (location !== "/onboarding") {
      // Cleanly locks layout view state engine straight to survey
      window.location.replace("/onboarding");
      return null;
    }
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen bg-background">
      <NavSidebar
        username={user?.displayName || user?.username || "Agent"}
        tier={subscription?.planId || user?.tier || "free"}
      />
      <main className="ml-60 min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          {welcomeMessage && (
            <div className="mb-4 flex items-center justify-between px-4 py-3 rounded-lg border border-emerald-500/25 bg-emerald-500/8 text-sm text-emerald-400 animate-fade-in-up">
              <span>🎉 {welcomeMessage}</span>
              <button onClick={() => setWelcomeMessage(null)} className="text-emerald-400/60 hover:text-emerald-400 ml-4">✕</button>
            </div>
          )}
          <Switch>
            <Route path="/" component={Scanner} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/history" component={History} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/settings" component={Settings} />
            <Route path="/profile" component={Profile} />
            <Route path="/api-keys" component={ApiKeys} />
            <Route path="/onboarding" component={Onboarding} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>

      {needsPasswordSetup && (
        <PasswordUpdateModal
          displayName={user?.displayName || user?.username}
          isNewUser={true}
          onClose={() => setNeedsPasswordSetup(false)}
          onSave={handlePasswordSave}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppShell />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;