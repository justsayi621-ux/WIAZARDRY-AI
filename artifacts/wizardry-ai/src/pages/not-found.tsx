import { useNavigate } from "@/hooks/useNavigate";
import { Zap } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4 animate-fade-in-up">
      <div className="w-16 h-16 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Zap className="w-8 h-8 text-primary opacity-40" />
      </div>
      <div>
        <h1 className="text-4xl font-bold mono text-muted-foreground">404</h1>
        <p className="text-sm text-muted-foreground mt-2">Signal lost — page not found</p>
      </div>
      <button
        onClick={() => navigate("/dashboard")}
        className="px-5 py-2.5 rounded-md bg-primary/15 border border-primary/30 text-primary text-sm font-semibold hover:bg-primary/25 transition-colors"
      >
        Return to Mission Control
      </button>
    </div>
  );
}
