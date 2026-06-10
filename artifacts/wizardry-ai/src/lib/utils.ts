import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function formatConfidence(score: number | null | undefined): string {
  if (score == null) return "—";
  return `${score.toFixed(1)}%`;
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function truncate(str: string | null | undefined, n = 40): string {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

export function parseJsonArray(str: string | null | undefined): string[] {
  if (!str) return [];
  try { return JSON.parse(str); } catch { return []; }
}

export function tokensToScans(tokens: number | null, perRound = 3): string {
  if (tokens === null) return "Unlimited scans";
  return `~${Math.floor(tokens / perRound)} scans`;
}
