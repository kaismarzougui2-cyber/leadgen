export type PlanId = "free" | "starter" | "pro";

export interface Plan {
  id: PlanId;
  name: string;
  price: number; // € / mois
  promoPrice?: number; // € / 1er mois pour nouveaux utilisateurs
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
    promoPrice: 12,
    searches: 100,
    features: [
      "100 recherches / mois",
      "CRM intégré",
      "Export CSV illimité",
      "Simulateur ROI",
      "Support prioritaire",
    ],
    cta: "Démarrer — 1er mois à 12€",
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
