
import { useLocation } from "wouter";
import { useNavigate } from "@/hooks/useNavigate";
import { Zap, LayoutDashboard, ScanLine, History, Bell, Settings, User, Key, LogOut, ChevronRight, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useListNotifications } from "@workspace/api-client-react";

interface NavSidebarProps {
  username: string;
  tier: string;
}

const TIER_CONFIG: Record<string, { label: string; color: string }> = {
  free:       { label: "Free Tier",   color: "text-slate-400 border-slate-400/30 bg-slate-400/8" },
  basic:      { label: "Basic",       color: "text-blue-400 border-blue-400/30 bg-blue-400/8" },
  pro:        { label: "Pro",         color: "text-violet-400 border-violet-400/30 bg-violet-400/8" },
  advanced:   { label: "Advanced",    color: "text-cyan-400 border-cyan-400/30 bg-cyan-400/8" },
  enterprise: { label: "Enterprise",  color: "text-amber-400 border-amber-400/30 bg-amber-400/8" },
};

const NAV_ITEMS = [
  { path: "/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
  { path: "/",              icon: ScanLine,         label: "Scanner" },
  { path: "/history",       icon: History,          label: "History" },
  { path: "/notifications", icon: Bell,             label: "Notifications", badge: true },
  { path: "/settings",      icon: Settings,         label: "Settings" },
  { path: "/profile",       icon: User,             label: "Profile" },
  { path: "/api-keys",      icon: Key,              label: "API Keys" },
];

export default function NavSidebar({ username, tier }: NavSidebarProps) {
  const [location] = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const tc = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const { data: notifications } = useListNotifications();
  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <aside className="fixed left-0 top-0 h-full w-60 bg-card border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center glow-violet shrink-0">
            <Zap className="w-4.5 h-4.5 text-primary" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-foreground truncate">Wizardry AI</div>
            <div className="text-[10px] text-muted-foreground truncate">Deepfake Detection</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ path, icon: Icon, label, badge }) => {
          const active = location === path || (path !== "/" && location.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                active
                  ? "bg-primary/12 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="flex-1 text-left truncate">{label}</span>
              {badge && unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
              {active && <ChevronRight className="w-3 h-3 text-primary shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/20">
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-foreground truncate">{username}</div>
            <div className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5 uppercase tracking-wider", tc.color)}>
              {tc.label}
            </div>
          </div>
        </div>

        <button
          onClick={() => { logout(); }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/8 transition-all group border border-transparent hover:border-destructive/20"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}