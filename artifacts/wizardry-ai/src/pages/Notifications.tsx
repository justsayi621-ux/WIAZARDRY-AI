import { Bell, CheckCheck, AlertCircle, Info, Zap, MessageSquare, Shield, Sparkles, Clock } from "lucide-react";
import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@workspace/api-client-react";
import { getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn, formatRelative } from "@/lib/utils";

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  scan_complete: { icon: Zap, color: "text-cyan-400", label: "Scan Result" },
  token_warning: { icon: AlertCircle, color: "text-amber-400", label: "Token Warning" },
  token_exhausted: { icon: AlertCircle, color: "text-destructive", label: "Token Exhausted" },
  upgrade_prompt: { icon: Sparkles, color: "text-violet-400", label: "Upgrade" },
  security_alert: { icon: Shield, color: "text-destructive", label: "Security" },
  greeting: { icon: MessageSquare, color: "text-emerald-400", label: "Message" },
  reminder: { icon: Clock, color: "text-amber-400", label: "Reminder" },
  suggestion: { icon: Info, color: "text-cyan-400", label: "Suggestion" },
  system: { icon: Info, color: "text-muted-foreground", label: "System" },
};

export default function Notifications() {
  const queryClient = useQueryClient();
  const { data: notifications, isLoading } = useListNotifications();
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  const handleMarkRead = async (id: number) => {
    await markRead.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
  };

  const handleMarkAll = async () => {
    await markAll.mutateAsync(void 0 as never);
    queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Bell className="w-5 h-5 text-primary" />
            Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unread > 0 ? `${unread} unread alert${unread > 1 ? "s" : ""}` : "All caught up"}
          </p>
        </div>
        {unread > 0 && (
          <button
            onClick={handleMarkAll}
            className="flex items-center gap-2 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
          Loading...
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground rounded-lg border border-border bg-card">
          <Bell className="w-10 h-10 opacity-25" />
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="text-xs">Scan results and system alerts will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n, i) => {
            const { icon: Icon, color, label } = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
            const isCritical = n.priority === "critical";
            return (
              <div
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={cn(
                  "rounded-lg border p-4 flex gap-3 cursor-pointer transition-all duration-200 animate-stagger-in",
                  n.read ? "border-border bg-card opacity-60" : "border-border bg-card hover:bg-muted/20",
                  isCritical && !n.read && "animate-critical-flash",
                )}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <div className={cn("w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5", `bg-current/10 ${color}`)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className={cn("text-[10px] font-semibold uppercase tracking-wider", color)}>{label}</span>
                      <h3 className={cn("text-sm font-semibold mt-0.5", n.read ? "text-muted-foreground" : "text-foreground")}>
                        {n.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-2 mono">{formatRelative(n.createdAt)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
