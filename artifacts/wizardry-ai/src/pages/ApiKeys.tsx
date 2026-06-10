import { useState } from "react";
import { Key, Plus, Trash2, Copy, CheckCircle2, ExternalLink, Code, Webhook } from "lucide-react";
import { useGetMe, useListApiKeys, useCreateApiKey, useDeleteApiKey, useListWebhooks, useCreateWebhook, useDeleteWebhook } from "@workspace/api-client-react";
import { getListApiKeysQueryKey, getListWebhooksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatRelative } from "@/lib/utils";
import PaywallOverlay from "@/components/PaywallOverlay";
import { cn } from "@/lib/utils";

const EVENT_OPTIONS = ["scan.complete", "scan.failed", "token.warning", "token.exhausted", "user.upgrade"];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
      {copied ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />Copied</> : <><Copy className="w-3.5 h-3.5" />Copy</>}
    </button>
  );
}

export default function ApiKeys() {
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();
  const isEnterprise = user?.tier === "enterprise";
  const { data: keys } = useListApiKeys();
  const { data: webhooks } = useListWebhooks();
  const createKey = useCreateApiKey();
  const deleteKey = useDeleteApiKey();
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();

  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyResult, setNewKeyResult] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>(["scan.complete"]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;
    const result = await createKey.mutateAsync({ data: { name: newKeyName } });
    setNewKeyResult((result as { fullKey?: string }).fullKey ?? null);
    setNewKeyName("");
    queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
  };

  const handleDeleteKey = async (id: number) => {
    await deleteKey.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListApiKeysQueryKey() });
  };

  const handleCreateWebhook = async () => {
    if (!webhookUrl.trim()) return;
    await createWebhook.mutateAsync({ data: { url: webhookUrl, events: selectedEvents } });
    setWebhookUrl("");
    queryClient.invalidateQueries({ queryKey: getListWebhooksQueryKey() });
  };

  const handleDeleteWebhook = async (id: number) => {
    await deleteWebhook.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getListWebhooksQueryKey() });
  };

  const curlSample = `curl -X POST https://api.wizardry-ai.com/v1/scans \\
  -H "Authorization: Bearer wai_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "mediaUrl": "https://example.com/video.mp4",
    "engine": "gemini-2.5-pro",
    "sensitivity": "high"
  }'`;

  return (
    <div className="space-y-6 relative min-h-[60vh]">
      {!isEnterprise && <PaywallOverlay requiredTier="Enterprise" />}

      <div className={cn(!isEnterprise && "blur-sm select-none pointer-events-none")}>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Key className="w-5 h-5 text-primary" />
            Developer API Terminal
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage API keys, webhooks, and integration credentials.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          {/* API Keys */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Key className="w-4 h-4 text-primary" />
              API Keys
            </h2>

            {newKeyResult && (
              <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/25 space-y-2">
                <p className="text-xs text-emerald-400 font-semibold">Key generated — copy now, it won't be shown again</p>
                <div className="flex items-center gap-2">
                  <code className="text-xs mono text-foreground bg-muted/40 px-2 py-1 rounded flex-1 truncate">{newKeyResult}</code>
                  <CopyButton text={newKeyResult} />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g. Production)"
                className="flex-1 bg-input/40 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || createKey.isPending}
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-primary/15 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/25 transition-colors disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Generate
              </button>
            </div>

            <div className="space-y-2">
              {(!keys || keys.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-4">No API keys generated yet</p>
              ) : keys.map((key) => (
                <div key={key.id} className="flex items-center gap-3 p-3 rounded-md bg-muted/20 border border-border/50">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">{key.name}</div>
                    <div className="text-xs mono text-muted-foreground">{key.keyPreview}</div>
                    <div className="text-[11px] text-muted-foreground/60">{key.lastUsedAt ? `Last used ${formatRelative(key.lastUsedAt)}` : "Never used"}</div>
                  </div>
                  <CopyButton text={key.keyPreview} />
                  <button onClick={() => handleDeleteKey(key.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Webhooks */}
          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Webhook className="w-4 h-4 text-cyan-400" />
              Webhook Endpoints
            </h2>

            <div className="space-y-3">
              <input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://your-server.com/webhook"
                className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block mb-2">Events</label>
                <div className="flex flex-wrap gap-1.5">
                  {EVENT_OPTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setSelectedEvents((prev) => prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e])}
                      className={cn(
                        "text-[11px] px-2 py-1 rounded border transition-all mono",
                        selectedEvents.includes(e) ? "bg-cyan-400/15 border-cyan-400/30 text-cyan-400" : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={handleCreateWebhook}
                disabled={!webhookUrl.trim()}
                className="w-full py-2 rounded-md bg-cyan-400/10 border border-cyan-400/25 text-cyan-400 text-sm font-semibold hover:bg-cyan-400/15 transition-colors disabled:opacity-50"
              >
                Register Webhook
              </button>
            </div>

            <div className="space-y-2">
              {(!webhooks || webhooks.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-4">No webhooks registered</p>
              ) : (webhooks as Array<{ id: number; url: string; events: string[]; active: boolean }>).map((hook) => (
                <div key={hook.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/20 border border-border/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
                      <span className="text-xs mono text-foreground truncate">{hook.url}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {(hook.events || []).map((e: string) => (
                        <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 mono">{e}</span>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => handleDeleteWebhook(hook.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* cURL Sample */}
        <div className="rounded-lg border border-border bg-card p-5 mt-6">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
            <Code className="w-4 h-4 text-primary" />
            Sample Request
          </h2>
          <div className="relative rounded-lg bg-muted/30 border border-border overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/20">
              <span className="text-[11px] text-muted-foreground mono">curl</span>
              <CopyButton text={curlSample} />
            </div>
            <pre className="text-xs mono text-foreground/80 p-4 overflow-x-auto leading-relaxed">{curlSample}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
