export type PlanId = "free" | "starter" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // € / mois
  searches: number; // recherches / mois
  features: string[];
  cta: string;
  highlighted: boolean;
  stripePriceId: string | null;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Freemium",
    price: 0,
    searches: 5,
    features: [
      "5 recherches / mois",
      "CRM intégré",
      "Export des leads",
      "Support par email",
    ],
    cta: "Commencer gratuitement",
    highlighted: false,
    stripePriceId: null,
  },
  {
    id: "starter",
    name: "Starter",
    price: 25,
    searches: 100,
    features: [
      "100 recherches / mois",
      "CRM intégré",
      "Export CSV illimité",
      "Simulateur ROI",
      "Support prioritaire",
    ],
    cta: "Démarrer à 25€/mois",
    highlighted: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? null,
  },
  {
    id: "pro",
    name: "Pro",
    price: 59,
    searches: 500,
    features: [
      "500 recherches / mois",
      "CRM intégré",
      "Export CSV illimité",
      "Simulateur ROI avancé",
      "Accès API",
      "Support dédié",
    ],
    cta: "Passer Pro à 59€/mois",
    highlighted: false,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? null,
  },
];

export const PLAN_LIMITS: Record<PlanId, number> = {
  free: 5,
  starter: 100,
  pro: 500,
};
