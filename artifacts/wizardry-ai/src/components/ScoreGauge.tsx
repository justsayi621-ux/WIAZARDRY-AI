import { cn } from "@/lib/utils";

interface Props {
  score: number;
  label?: string;
  size?: number;
  className?: string;
}

const GRADE_COLORS: Record<string, string> = {
  "A+": "#7c3aed",
  "A": "#06b6d4",
  "B": "#22c55e",
  "C": "#f59e0b",
  "D": "#ef4444",
};

function scoreToGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

export default function ScoreGauge({ score, label, size = 120, className }: Props) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const grade = scoreToGrade(score);
  const color = GRADE_COLORS[grade];

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke="hsl(230 20% 14%)"
            strokeWidth={8}
          />
          {/* Progress arc */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold mono" style={{ color }}>
            {Math.round(score)}
          </span>
          <span
            className="text-[11px] font-bold px-1.5 py-0.5 rounded text-white mt-0.5"
            style={{ background: color + "33", color }}
          >
            {grade}
          </span>
        </div>
      </div>
      {label && <span className="text-xs text-muted-foreground font-medium">{label}</span>}
    </div>
  );
}

export function MiniScoreRing({ score, label, color = "#7c3aed" }: { score: number; label: string; color?: string }) {
  const size = 56;
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={28} cy={28} r={radius} fill="none" stroke="hsl(230 20% 14%)" strokeWidth={5} />
          <circle
            cx={28} cy={28} r={radius} fill="none" stroke={color} strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            transform="rotate(-90 28 28)"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] font-bold mono" style={{ color }}>{Math.round(score)}</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground text-center leading-tight">{label}</span>
    </div>
  );
}
