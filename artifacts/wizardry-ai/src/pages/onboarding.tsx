import { useState } from "react";
import { Zap, ChevronRight, CheckCircle2 } from "lucide-react";
import { useNavigate } from "@/hooks/useNavigate";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const QUESTIONS = [
  {
    id: "role",
    question: "What best describes your role?",
    options: ["Security Researcher", "Journalist / Media", "Law Enforcement", "Enterprise / Business", "Developer / Engineer", "Individual / Personal Use"],
  },
  {
    id: "primary_use",
    question: "What will you primarily use Wizardry AI for?",
    options: ["Detecting deepfake videos", "Verifying news media authenticity", "Social media content verification", "Legal or forensic evidence", "Research & development", "General curiosity"],
  },
  {
    id: "scan_volume",
    question: "How many scans do you expect to run per month?",
    options: ["1-10 (occasional use)", "10-50 (regular use)", "50-200 (heavy use)", "200+ (enterprise scale)"],
  },
  {
    id: "heard_from",
    question: "How did you hear about Wizardry AI?",
    options: ["Search engine", "Social media", "News article", "Colleague / referral", "Other"],
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const navigate = useNavigate();
  const { userId, setNeedsOnboarding } = useAuth();

  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const handleSelect = async (value: string) => {
    const newAnswers = { ...answers, [current.id]: value };
    setAnswers(newAnswers);

    if (isLast) {
      try {
        await fetch("/api/auth/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-user-id": String(userId ?? 0) },
          body: JSON.stringify({ answers: newAnswers }),
        });
      } catch { /* continue anyway */ }
      setNeedsOnboarding(false);
      setDone(true);
      setTimeout(() => navigate("/dashboard"), 1800);
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleSkip = () => {
    setNeedsOnboarding(false);
    navigate("/dashboard");
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center space-y-4 animate-fade-in-up">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground">You're all set!</h2>
          <p className="text-sm text-muted-foreground">Taking you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in-up">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative w-14 h-14 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center glow-violet">
              <Zap className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome to Wizardry AI</h1>
          <p className="text-sm text-muted-foreground mt-1">Help us personalize your experience</p>
        </div>

        <div className="flex gap-1.5">
          {QUESTIONS.map((_, i) => (
            <div key={i} className={cn("h-1 flex-1 rounded-full transition-all duration-300",
              i < step ? "bg-primary" : i === step ? "bg-primary/60" : "bg-muted/40"
            )} />
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Question {step + 1} of {QUESTIONS.length}</p>
            <h2 className="text-lg font-bold text-foreground mt-1">{current.question}</h2>
          </div>
          <div className="space-y-2">
            {current.options.map((option) => (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3.5 rounded-xl border text-left transition-all group",
                  answers[current.id] === option
                    ? "bg-primary/10 border-primary/40 text-foreground"
                    : "border-border bg-muted/10 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-muted/20"
                )}
              >
                <span className="text-sm font-medium">{option}</span>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-primary" />
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSkip} className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center">
          Skip for now →
        </button>
      </div>
    </div>
  );
}