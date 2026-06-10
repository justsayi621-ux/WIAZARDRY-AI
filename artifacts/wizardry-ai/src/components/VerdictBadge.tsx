import { cn } from "@/lib/utils";

type Verdict = "ai" | "real" | "mixed" | "unknown";

const LABELS: Record<Verdict, string> = {
  ai: "AI Detected",
  real: "Authentic",
  mixed: "Mixed",
  unknown: "Unknown",
};

interface Props {
  verdict: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function VerdictBadge({ verdict, size = "sm", className }: Props) {
  const v = verdict as Verdict;
  const sizeClasses = { sm: "text-[10px] px-2 py-0.5", md: "text-xs px-2.5 py-1", lg: "text-sm px-3 py-1.5 font-semibold" };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-medium tracking-wide",
        `verdict-${v}`,
        sizeClasses[size],
        className
      )}
    >
      {LABELS[v] || verdict}
    </span>
  );
}
