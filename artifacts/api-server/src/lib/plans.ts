export const TOKENS_PER_ROUND = 5;

export const AI_ENGINES = [
  {
    value: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash — Ultra Fast",
    description: "Best for quick scans. Optimized for speed.",
    minTier: "free",
    badge: null,
  },
  {
    value: "gemini-2.5-pro",
    label: "Gemini 2.5 Pro — Deep Analysis",
    description: "Enhanced accuracy with full frame analysis.",
    minTier: "basic",
    badge: "Basic+",
  },
  {
    value: "gemini-2.0-ultra",
    label: "Gemini 2.0 Ultra — Maximum Precision",
    description: "Highest fidelity deepfake detection with multi-pass inference.",
    minTier: "pro",
    badge: "Pro+",
  },
  {
    value: "zak-global",
    label: "ZAK Global Search — Surface + Deep Web Audit",
    description: "Cross-references surface and deep web databases for verified media provenance.",
    minTier: "advanced",
    badge: "Advanced+",
  },
  {
    value: "wizardry-neural-x",
    label: "Wizardry Neural X — Enterprise Flagship",
    description: "Full multi-modal analysis: biometrics, temporal, web provenance, and audio-visual sync.",
    minTier: "enterprise",
    badge: "Enterprise",
  },
];

export const PLANS = [
  {
    id: "free",
    name: "Free Tier",
    price: 0,
    tokenLimit: 5,
    tokensPerRound: 5,
    features: [
      "Gemini 2.5 Flash only",
      "5 tokens total (1 scan)",
      "Basic scan results",
      "Community support",
    ],
    recommended: false,
    canUseCombinedInput: false,
    canViewDecisionHistory: false,
    canUseLivePreview: false,
    availableEngines: ["gemini-2.5-flash"],
  },
  {
    id: "basic",
    name: "Basic",
    price: 9,
    tokenLimit: 250,
    tokensPerRound: 5,
    features: [
      "Gemini 2.5 Flash & Pro",
      "250 tokens/month (~50 scans)",
      "Detailed analysis reports",
      "Email support",
    ],
    recommended: false,
    canUseCombinedInput: false,
    canViewDecisionHistory: false,
    canUseLivePreview: false,
    availableEngines: ["gemini-2.5-flash", "gemini-2.5-pro"],
  },
  {
    id: "pro",
    name: "Pro",
    price: 29,
    tokenLimit: 1000,
    tokensPerRound: 5,
    features: [
      "Gemini Flash, Pro & Ultra",
      "1,000 tokens/month (~200 scans)",
      "Priority processing queue",
      "Anomaly breakdown",
      "Priority support",
    ],
    recommended: true,
    canUseCombinedInput: false,
    canViewDecisionHistory: false,
    canUseLivePreview: false,
    availableEngines: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-ultra"],
  },
  {
    id: "advanced",
    name: "Advanced",
    price: 59,
    tokenLimit: 3000,
    tokensPerRound: 5,
    features: [
      "All AI engines incl. ZAK Global",
      "3,000 tokens/month (~600 scans)",
      "Combined URL + video scanning",
      "AI decision history dialog",
      "Live media previews",
      "Batch scanning",
      "Dedicated support",
    ],
    recommended: false,
    canUseCombinedInput: true,
    canViewDecisionHistory: true,
    canUseLivePreview: true,
    availableEngines: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-ultra", "zak-global"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 149,
    tokenLimit: 5000,
    tokensPerRound: 5,
    features: [
      "All AI engines incl. Wizardry Neural X",
      "5,000 tokens/month (~1,000 scans)",
      "Combined URL + video scanning",
      "AI decision history dialog",
      "Live media previews",
      "API Developer Tab access",
      "Webhook integrations",
      "Custom API keys",
      "Audit logs",
      "SLA guarantee",
      "White-glove onboarding",
    ],
    recommended: false,
    canUseCombinedInput: true,
    canViewDecisionHistory: true,
    canUseLivePreview: true,
    availableEngines: ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-ultra", "zak-global", "wizardry-neural-x"],
  },
];

export const TOKEN_PACKS = [
  {
    id: "starter",
    name: "Starter Pack",
    price: 5,
    tokenLimit: 100,
    tokensPerRound: 1,
    features: [
      "100 tokens prepaid",
      "Best for light usage",
      "Pay-as-you-go wallet top-up",
    ],
    recommended: false,
  },
  {
    id: "wizard",
    name: "Wizard Pack",
    price: 15,
    tokenLimit: 350,
    tokensPerRound: 1,
    features: [
      "350 tokens prepaid",
      "Includes 50 bonus tokens",
      "Ideal for regular scanning",
    ],
    recommended: true,
  },
  {
    id: "archmage",
    name: "Archmage Pack",
    price: 30,
    tokenLimit: 800,
    tokensPerRound: 1,
    features: [
      "800 tokens prepaid",
      "Includes 200 bonus tokens",
      "Best value for heavy usage",
    ],
    recommended: false,
  },
];

const TIER_ORDER = ["free", "basic", "pro", "advanced", "enterprise"];

export function getTokenLimit(planId: string): number {
  return PLANS.find((p) => p.id === planId)?.tokenLimit ?? 5;
}

export function getPlan(planId: string) {
  return PLANS.find((p) => p.id === planId);
}

export function getTokenPack(packId: string) {
  return TOKEN_PACKS.find((p) => p.id === packId);
}

export function canUseCombinedInput(planId: string): boolean {
  return PLANS.find((p) => p.id === planId)?.canUseCombinedInput ?? false;
}

export function canViewDecisionHistory(planId: string): boolean {
  return PLANS.find((p) => p.id === planId)?.canViewDecisionHistory ?? false;
}

export function canUseLivePreview(planId: string): boolean {
  return PLANS.find((p) => p.id === planId)?.canUseLivePreview ?? false;
}

export function canUseEngine(planId: string, engineId: string): boolean {
  const plan = PLANS.find((p) => p.id === planId);
  return plan?.availableEngines.includes(engineId) ?? false;
}

export function tierRank(planId: string): number {
  return TIER_ORDER.indexOf(planId);
}
