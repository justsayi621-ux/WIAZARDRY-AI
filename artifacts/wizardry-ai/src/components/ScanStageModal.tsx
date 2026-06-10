import { useEffect, useState } from "react";
import { Cpu, Zap } from "lucide-react";

interface ScanStageModalProps {
  stages: string[];
  engine: string;
  isOpen: boolean;
}

const ENGINE_COLORS: Record<string, { ring: string; glow: string; label: string }> = {
  "gemini-2.5-flash":  { ring: "border-violet-500/60",  glow: "shadow-violet-500/20",  label: "GEMINI 2.5 FLASH" },
  "gemini-2.5-pro":    { ring: "border-cyan-500/60",    glow: "shadow-cyan-500/20",    label: "GEMINI 2.5 PRO" },
  "gemini-2.0-ultra":  { ring: "border-blue-500/60",    glow: "shadow-blue-500/20",    label: "GEMINI 2.0 ULTRA" },
  "zak-global":        { ring: "border-emerald-500/60", glow: "shadow-emerald-500/20", label: "ZAK GLOBAL" },
  "wizardry-neural-x": { ring: "border-amber-500/60",   glow: "shadow-amber-500/20",   label: "WIZARDRY NEURAL X" },
};

export default function ScanStageModal({ stages, engine, isOpen }: ScanStageModalProps) {
  const [currentStage, setCurrentStage] = useState(0);
  const [completedStages, setCompletedStages] = useState<number[]>([]);
  const theme = ENGINE_COLORS[engine] ?? ENGINE_COLORS["gemini-2.5-flash"];

  useEffect(() => {
    if (!isOpen) {
      setCurrentStage(0);
      setCompletedStages([]);
      return;
    }
    setCurrentStage(0);
    setCompletedStages([]);

    const totalDuration = 2800;
    const stageInterval = totalDuration / stages.length;

    const timers: ReturnType<typeof setTimeout>[] = [];
    stages.forEach((_, i) => {
      timers.push(setTimeout(() => {
        setCurrentStage(i);
        if (i > 0) setCompletedStages((prev) => [...prev, i - 1]);
      }, i * stageInterval));
    });

    return () => timers.forEach(clearTimeout);
  }, [isOpen, stages, engine]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`relative w-full max-w-md mx-4 rounded-2xl border-2 ${theme.ring} bg-[#080c18] shadow-2xl ${theme.glow} overflow-hidden`}>
        {/* Animated scan line */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent animate-scan-line"
            style={{ animation: "scanLine 2.5s linear infinite" }}
          />
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border ${theme.ring} bg-primary/10 flex items-center justify-center`}>
              <Cpu className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-bold tracking-widest text-primary uppercase">{theme.label}</div>
              <div className="text-sm font-bold text-foreground">Forensic Analysis in Progress</div>
            </div>
            <div className="ml-auto flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>

          {/* Radar Animation */}
          <div className="flex justify-center">
            <div className="relative w-28 h-28 flex items-center justify-center">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="absolute rounded-full border border-primary/30"
                  style={{ width: 32 + i * 24, height: 32 + i * 24, animation: `radarPulse 2s ease-out infinite`, animationDelay: `${(i - 1) * 0.5}s` }}
                />
              ))}
              <div
                className="absolute w-full h-full rounded-full"
                style={{
                  background: "conic-gradient(from 0deg, transparent 0%, hsla(262,83%,58%,0.2) 40%, transparent 40%)",
                  animation: "radarSweep 1.8s linear infinite",
                }}
              />
              <div className="relative z-10 w-10 h-10 rounded-full border border-primary/60 bg-primary/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>

          {/* Stage list */}
          <div className="space-y-2">
            {stages.map((stage, i) => {
              const isDone = completedStages.includes(i);
              const isActive = currentStage === i;
              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-500 ${
                    isActive
                      ? "bg-primary/10 border border-primary/30"
                      : isDone
                      ? "bg-emerald-500/5 border border-emerald-500/15"
                      : "border border-transparent opacity-30"
                  }`}
                >
                  <div className={`flex-shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                    isDone ? "bg-emerald-500/20 border-emerald-500/50" : isActive ? "border-primary animate-pulse" : "border-muted-foreground/20"
                  }`}>
                    {isDone && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />}
                    {isActive && <div className="w-1.5 h-1.5 bg-primary rounded-full animate-ping" />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-primary" : isDone ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {stage}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Token cost */}
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground border-t border-border/50 pt-3">
            <span>Scan cost:</span>
            <span className="font-bold text-primary mono">5 tokens</span>
          </div>
        </div>
      </div>
    </div>
  );
}
