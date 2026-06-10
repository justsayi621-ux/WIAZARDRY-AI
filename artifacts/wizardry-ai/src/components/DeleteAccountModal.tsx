import { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface DeleteAccountModalProps {
  username: string;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

export default function DeleteAccountModal({ username, onClose, onConfirm }: DeleteAccountModalProps) {
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const PHRASE = "DELETE_MY_ACCOUNT";
  const ready = typed === PHRASE;

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);
    try {
      await onConfirm();
    } catch (e: unknown) {
      setError((e as { data?: { error?: string } })?.data?.error ?? "Failed to delete account.");
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-[#080c18] border border-destructive/40 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Delete Account</h2>
                <p className="text-xs text-muted-foreground">This cannot be undone</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted/40 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-destructive/8 border border-destructive/25 space-y-2 text-xs text-destructive">
            <p className="font-bold">Warning — permanent action:</p>
            <ul className="space-y-1 text-muted-foreground ml-2">
              {["All scan history will be erased", "Your subscription will be cancelled", "API keys and webhooks deleted", "Account data permanently removed"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-destructive/60 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Type <span className="text-destructive font-mono">{PHRASE}</span> to confirm
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={PHRASE}
              className="w-full bg-input/40 border border-border rounded-lg px-4 py-3 text-sm font-mono text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-destructive"
            />
          </div>

          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/25 rounded-lg px-3 py-2">{error}</div>
          )}

          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!ready || deleting}
              className="flex-1 py-2.5 rounded-lg bg-destructive/90 text-white font-semibold text-sm hover:bg-destructive transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {deleting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete {username}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
