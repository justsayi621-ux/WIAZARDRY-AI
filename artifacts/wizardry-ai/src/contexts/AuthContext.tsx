import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { setDefaultHeaders } from "@workspace/api-client-react";

interface AuthContextValue {
  userId: number | null;
  isAuthenticated: boolean;
  login: (id: number) => void;
  logout: () => void;
  welcomeMessage: string | null;
  setWelcomeMessage: (msg: string | null) => void;
  needsPasswordSetup: boolean;
  setNeedsPasswordSetup: (v: boolean) => void;
  needsOnboarding: boolean;
  setNeedsOnboarding: (v: boolean) => void;
}

const AuthContext = createContext<AuthContextValue>({
  userId: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
  welcomeMessage: null,
  setWelcomeMessage: () => {},
  needsPasswordSetup: false,
  setNeedsPasswordSetup: () => {},
  needsOnboarding: false,
  setNeedsOnboarding: () => {},
});

function getStoredUserId(): number | null {
  try {
    const v = localStorage.getItem("wizardry_user_id");
    if (!v) return null;
    const id = parseInt(v, 10);
    return isNaN(id) || id <= 0 ? null : id;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<number | null>(getStoredUserId);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
  const [needsPasswordSetup, setNeedsPasswordSetup] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (userId && userId > 0) {
      setDefaultHeaders({ "x-user-id": String(userId) });
    } else {
      setDefaultHeaders({ "x-user-id": "" });
    }
  }, [userId]);

  const login = useCallback((id: number) => {
    localStorage.setItem("wizardry_user_id", String(id));
    setUserId(id);
    setDefaultHeaders({ "x-user-id": String(id) });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("wizardry_user_id");
    localStorage.removeItem("wizardry_needs_pw_setup");
    setUserId(null);
    setNeedsPasswordSetup(false);
    setNeedsOnboarding(false);
    setDefaultHeaders({ "x-user-id": "" });
    // Hard redirect to login
    window.location.replace("/login");
  }, []);

  return (
    <AuthContext.Provider value={{
      userId,
      isAuthenticated: userId !== null && userId > 0,
      login,
      logout,
      welcomeMessage,
      setWelcomeMessage,
      needsPasswordSetup,
      setNeedsPasswordSetup,
      needsOnboarding,
      setNeedsOnboarding,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}