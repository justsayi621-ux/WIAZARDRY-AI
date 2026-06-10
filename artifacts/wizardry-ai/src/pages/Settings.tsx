import { useState, useEffect } from "react";
import { Settings as SettingsIcon, Cpu, ScanLine, Database, Bell, Shield, Save, CheckCircle2, AlertTriangle, Lock, Webhook, Zap, Trash2 } from "lucide-react";
import { useGetSettings, useUpdateSettings, useGetCurrentSubscription } from "@workspace/api-client-react";
import { getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import DeleteAccountModal from "@/components/DeleteAccountModal";
import TwoFactorSetupModal from "@/components/TwoFactorSetupModal";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "@/hooks/useNavigate";

const TIER_RANK: Record<string, number> = { free: 0, basic: 1, pro: 2, advanced: 3, enterprise: 4 };

function SectionHeader({ icon: Icon, title, badge, badgeColor }: { icon: React.ElementType; title: string; badge?: string; badgeColor?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      {badge && <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border", badgeColor || "bg-primary/10 text-primary border-primary/20")}>{badge}</span>}
    </div>
  );
}

function Toggle({ checked, onChange, label, sub, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; sub?: string; disabled?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border/50 last:border-0">
      <div>
        <div className={cn("text-sm font-medium", disabled ? "text-muted-foreground/50" : "text-foreground")}>{label}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      <button
        onClick={() => !disabled && onChange(!checked)}
        disabled={disabled}
        style={{ height: 22, width: 40 }}
        className={cn("relative rounded-full transition-colors shrink-0 mt-0.5 disabled:opacity-40 disabled:cursor-not-allowed", checked ? "bg-primary" : "bg-muted border border-border")}
      >
        <span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

function RadioGroup({ value, options, onChange }: { value: string; options: { value: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button key={opt.value} onClick={() => onChange(opt.value)}
          className={cn("px-3 py-2 rounded-md text-xs font-semibold border transition-all",
            value === opt.value ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function SelectField({ value, options, onChange, disabled }: { value: string | number | null; options: { value: string; label: string }[]; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      className="bg-input/40 border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function PaywallBadge({ tier }: { tier: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
      <Lock className="w-3 h-3" />{tier}
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const { data: subscription } = useGetCurrentSubscription();
  const updateSettings = useUpdateSettings();
  const [local, setLocal] = useState<Record<string, unknown>>({});
  const [saved, setSaved] = useState(false);
  const [showAutoDeleteWarning, setShowAutoDeleteWarning] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const { logout, userId } = useAuth();
  const navigate = useNavigate();

  const planId = subscription?.planId || "free";
  const tierRank = TIER_RANK[planId] ?? 0;
  const isAdvanced = tierRank >= TIER_RANK["advanced"];
  const isEnterprise = planId === "enterprise";

  useEffect(() => { if (settings) setLocal(settings as unknown as Record<string, unknown>); }, [settings]);

  const update = (key: string, value: unknown) => {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    await updateSettings.mutateAsync({ data: local as never });
    queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDeleteAccount = async () => {
    const res = await fetch("/api/auth/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json", "x-user-id": String(userId ?? 0) },
      body: JSON.stringify({ confirmation: "DELETE_MY_ACCOUNT" }),
    });
    if (!res.ok) { const d = await res.json(); throw { data: d }; }
    logout();
    navigate("/login");
  };

  const handle2FASetup = async () => {
    const res = await fetch("/api/auth/2fa/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": String(userId ?? 0) },
    });
    if (!res.ok) { const d = await res.json(); throw { data: d }; }
    return res.json();
  };

  const handle2FAVerify = async (otp: string) => {
    const res = await fetch("/api/auth/2fa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": String(userId ?? 0) },
      body: JSON.stringify({ otp }),
    });
    if (!res.ok) { const d = await res.json(); throw { data: d }; }
    update("twoFactorEnabled", true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-3" />
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <SettingsIcon className="w-5 h-5 text-primary" />
            Engine Control Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Configure scan behavior, security, and notifications.</p>
        </div>
        <button
          onClick={handleSave}
          className={cn("flex items-center gap-2 px-4 py-2 rounded-md text-sm font-semibold transition-all border",
            saved ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-primary/15 border-primary/30 text-primary hover:bg-primary/25"
          )}
        >
          {saved ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> Save</>}
        </button>
      </div>

      {/* Inference Engine */}
      <div className="rounded-lg border border-border bg-card p-5">
        <SectionHeader icon={Cpu} title="Inference Engine" badge="Core" />
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Inference Mode</label>
            <RadioGroup value={String(local.inferenceMode || "hybrid")} options={[{ value: "hybrid", label: "Hybrid" }, { value: "on_device", label: "On-Device" }, { value: "cloud", label: "Cloud" }]} onChange={(v) => update("inferenceMode", v)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Data Usage Mode</label>
            <RadioGroup value={String(local.dataUsageMode || "normal")} options={[{ value: "wifi_only", label: "WiFi Only" }, { value: "low_data", label: "Low Data" }, { value: "normal", label: "Normal" }]} onChange={(v) => update("dataUsageMode", v)} />
          </div>
        </div>
      </div>

      {/* Scan Configuration */}
      <div className="rounded-lg border border-border bg-card p-5">
        <SectionHeader icon={ScanLine} title="Scan Configuration" badge="Medium" badgeColor="bg-amber-500/10 text-amber-400 border-amber-500/20" />
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Default Scan Sensitivity</label>
            <RadioGroup value={String(local.scanSensitivity || "medium")} options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} onChange={(v) => update("scanSensitivity", v)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Auto-Delete Scans After</label>
            <div className="flex items-center gap-3">
              <SelectField
                value={String(local.autoDeleteDays ?? "")}
                options={[{ value: "", label: "Never" }, { value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }]}
                onChange={(v) => { if (v && v !== "") setShowAutoDeleteWarning(true); update("autoDeleteDays", v ? parseInt(v) : null); }}
              />
              {showAutoDeleteWarning && (
                <div className="flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertTriangle className="w-3.5 h-3.5" />Scans will be permanently deleted
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className={cn("rounded-lg border bg-card p-5", isAdvanced ? "border-cyan-500/20" : "border-border opacity-75")}>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader icon={Zap} title="Advanced Configuration" badge="Advanced+" badgeColor="bg-cyan-500/10 text-cyan-400 border-cyan-500/20" />
          {!isAdvanced && <PaywallBadge tier="Advanced+" />}
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Export Format</label>
            <SelectField
              value={String(local.exportFormat || "json")}
              options={[{ value: "json", label: "JSON" }, { value: "csv", label: "CSV" }, { value: "pdf", label: "PDF Report" }]}
              onChange={(v) => update("exportFormat", v)}
              disabled={!isAdvanced}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Custom Confidence Threshold (%)</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={50} max={99} step={1}
                value={Number(local.customSensitivityThreshold) || 75}
                onChange={(e) => update("customSensitivityThreshold", parseFloat(e.target.value))}
                disabled={!isAdvanced}
                className="flex-1 accent-primary h-1.5 rounded-full disabled:opacity-40"
              />
              <span className="mono text-sm text-primary font-bold w-10 text-right">{Number(local.customSensitivityThreshold) || 75}%</span>
            </div>
          </div>
          <Toggle checked={!!local.batchScanEnabled} onChange={(v) => update("batchScanEnabled", v)} label="Batch Scanning" sub="Process multiple files in one operation" disabled={!isAdvanced} />
          <Toggle checked={!!local.priorityQueueEnabled} onChange={(v) => update("priorityQueueEnabled", v)} label="Priority Queue" sub="Jump to the front of the scan queue" disabled={!isAdvanced} />
        </div>
      </div>

      {/* Enterprise Settings */}
      <div className={cn("rounded-lg border bg-card p-5", isEnterprise ? "border-amber-500/20" : "border-border opacity-60")}>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader icon={Webhook} title="Enterprise Configuration" badge="Enterprise" badgeColor="bg-amber-500/10 text-amber-400 border-amber-500/20" />
          {!isEnterprise && <PaywallBadge tier="Enterprise" />}
        </div>
        <div className="space-y-4">
          <Toggle checked={!!local.webhookEnabled} onChange={(v) => update("webhookEnabled", v)} label="Webhook Notifications" sub="POST scan results to your endpoint" disabled={!isEnterprise} />
          {!!local.webhookEnabled && isEnterprise && (
            <div className="space-y-1.5 animate-fade-in-up">
              <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block">Webhook URL</label>
              <input
                type="url"
                value={String(local.webhookUrl || "")}
                onChange={(e) => update("webhookUrl", e.target.value)}
                placeholder="https://your-api.com/webhooks/wizardry"
                className="w-full bg-input/40 border border-border rounded-md px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          <Toggle checked={!!local.auditLogEnabled} onChange={(v) => update("auditLogEnabled", v)} label="Audit Log" sub="Track all user actions for compliance" disabled={!isEnterprise} />
          <Toggle checked={!!local.whitelabelEnabled} onChange={(v) => update("whitelabelEnabled", v)} label="White-label Mode" sub="Remove Wizardry AI branding from reports" disabled={!isEnterprise} />
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">API Rate Limit (per minute)</label>
            <div className="flex items-center gap-3">
              <input
                type="range" min={10} max={600} step={10}
                value={Number(local.apiRateLimitPerMinute) || 60}
                onChange={(e) => update("apiRateLimitPerMinute", parseInt(e.target.value))}
                disabled={!isEnterprise}
                className="flex-1 accent-primary h-1.5 rounded-full disabled:opacity-40"
              />
              <span className="mono text-sm text-primary font-bold w-16 text-right">{Number(local.apiRateLimitPerMinute) || 60}/min</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">IP Whitelist</label>
            <textarea
              value={String(local.ipWhitelist || "")}
              onChange={(e) => update("ipWhitelist", e.target.value)}
              placeholder="192.168.1.0/24, 10.0.0.1"
              disabled={!isEnterprise}
              rows={2}
              className="w-full bg-input/40 border border-border rounded-md px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none disabled:opacity-40"
            />
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="rounded-lg border border-border bg-card p-5">
        <SectionHeader icon={Database} title="Data & Privacy" />
        <Toggle checked={!!local.localOnlyMode} onChange={(v) => update("localOnlyMode", v)} label="Local-Only Mode" sub="Process all scans on-device. No data leaves your system." />
        {!!local.localOnlyMode && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-md bg-destructive/8 border border-destructive/20 text-xs text-destructive">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span>Local-Only Mode active — cloud AI engines are disabled.</span>
            <span className="ml-auto font-bold bg-destructive/15 px-2 py-0.5 rounded uppercase tracking-wider">HIGH SECURITY</span>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="rounded-lg border border-border bg-card p-5">
        <SectionHeader icon={Bell} title="Notifications" />
        <Toggle checked={!!local.pushNotifications} onChange={(v) => update("pushNotifications", v)} label="Push Notifications" sub="Receive alerts for completed scans" />
        <Toggle checked={!!local.notificationBarResults} onChange={(v) => update("notificationBarResults", v)} label="Notification Bar Results" sub="Show scan verdict in system notification bar" />
        <Toggle checked={!!local.silentMode} onChange={(v) => update("silentMode", v)} label="Silent Mode (Vibration Only)" sub="Suppress audio alerts, keep vibration" />
        <Toggle checked={!!local.priorityAlert} onChange={(v) => update("priorityAlert", v)} label="Priority Alert" sub="Flash UI when confidence score exceeds 85% — deepfake with high certainty" />
      </div>

      {/* Security & Account */}
      <div className="rounded-lg border border-destructive/20 bg-card p-5">
        <SectionHeader icon={Shield} title="Security & Account" badge="Critical" badgeColor="bg-destructive/10 text-destructive border-destructive/20" />
        <div>
          <div className="flex items-start justify-between gap-4 py-3 border-b border-border/50">
            <div>
              <div className="text-sm text-foreground font-medium">Two-Factor Authentication</div>
              <div className="text-xs text-muted-foreground mt-0.5">Add a second layer of identity verification using Google Authenticator</div>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-0.5">
              {local.twoFactorEnabled ? (
                <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded">Enabled</span>
              ) : (
                <button onClick={() => setShowTwoFactor(true)} className="text-xs text-primary bg-primary/10 border border-primary/25 px-2.5 py-1 rounded hover:bg-primary/20 transition-colors">
                  Set Up 2FA
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Session Timeout (minutes)</label>
            <div className="flex items-center gap-3">
              <input type="range" min={5} max={120} step={5} value={Number(local.sessionTimeout) || 30} onChange={(e) => update("sessionTimeout", parseInt(e.target.value))} className="flex-1 accent-primary h-1.5 rounded-full" />
              <span className="mono text-sm text-primary font-bold w-12 text-right">{Number(local.sessionTimeout) || 30}m</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Language</label>
            <SelectField value={String(local.language || "en")} options={[{ value: "en", label: "English" }, { value: "es", label: "Español" }, { value: "fr", label: "Français" }, { value: "de", label: "Deutsch" }]} onChange={(v) => update("language", v)} />
          </div>
        </div>

        {/* Danger zone */}
        <div className="mt-6 pt-5 border-t border-destructive/15 space-y-3">
          <p className="text-xs font-bold text-destructive uppercase tracking-wider">Danger Zone</p>
          <button
            onClick={() => setShowDeleteAccount(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-sm font-semibold"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
          <p className="text-[11px] text-muted-foreground">This will permanently erase all your data, scans, and subscription.</p>
        </div>
      </div>

      {showDeleteAccount && (
        <DeleteAccountModal username="my account" onClose={() => setShowDeleteAccount(false)} onConfirm={handleDeleteAccount} />
      )}

      {showTwoFactor && (
        <TwoFactorSetupModal onClose={() => setShowTwoFactor(false)} onSetup={handle2FASetup} onVerify={handle2FAVerify} />
      )}
    </div>
  );
}