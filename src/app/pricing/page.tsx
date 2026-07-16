"use client";

import { Zap, Check, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Réordonner pour mobile : plan mis en avant en premier
  const orderedPlans = [
    ...PLANS.filter((p) => p.highlighted),
    ...PLANS.filter((p) => !p.highlighted),
  ];

  async function handleSubscribe(planId: string, priceId: string | null) {
    if (!priceId) {
      router.push("/");
      return;
    }

    setLoading(planId);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      if (res.status === 401) {
        router.push(`/signup?priceId=${encodeURIComponent(priceId)}`);
        return;
      }

      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Une erreur est survenue. Réessayez.");
      }
    } catch {
      setError("Impossible de joindre le serveur. Réessayez.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-[9px] bg-[#E5000A] flex items-center justify-center shadow-[0_0_12px_rgba(229,0,10,0.3)] group-hover:shadow-[0_0_16px_rgba(229,0,10,0.45)] transition-shadow">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">LeadVibe</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-[#aaaaaa] hover:text-white transition-colors"
        >
          Se connecter
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </nav>

      <main className="flex-1 px-4 sm:px-6 py-16 sm:py-20 max-w-5xl mx-auto w-full">
        {/* ── Header ─────────────────────────────────────── */}
        <div className="text-center mb-14 space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-[#160002] border border-[#3a0002] rounded-full px-4 py-1.5 text-sm text-[#E5000A] font-medium">
            <Zap className="w-3.5 h-3.5" />
            Tarifs simples, sans surprise
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
            Choisissez votre plan
          </h1>
          <p className="text-[#aaaaaa] text-lg max-w-lg mx-auto leading-relaxed">
            Commencez gratuitement. Passez à un plan payant quand vous êtes prêt à scaler votre prospection.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-[12px] border border-red-500/30 bg-red-500/8 text-red-400 text-sm text-center animate-fade-in">
            {error}
          </div>
        )}

        {/* ── Plans ──────────────────────────────────────── */}
        {/* Sur mobile : ordre = highlighted en premier. Sur desktop : grid classique */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
          {orderedPlans.map((plan, index) => (
            <div
              key={plan.id}
              className={`
                animate-fade-in relative flex flex-col rounded-[12px] border p-7 sm:p-8
                transition-all duration-200
                ${plan.highlighted
                  ? "border-[#E5000A] bg-[#0d0d0d] shadow-[0_0_0_1px_#E5000A,0_8px_32px_rgba(229,0,10,0.18)] md:scale-[1.02] md:-translate-y-1"
                  : "border-[#1a1a1a] bg-[#0d0d0d] hover:border-[#2a2a2a]"
                }
              `}
              style={{ animationDelay: `${index * 0.07}s` }}
            >
              {/* Badge Populaire */}
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#E5000A] text-white text-xs font-bold px-4 py-1 rounded-full shadow-[0_4px_12px_rgba(229,0,10,0.4)]">
                  ⚡ Populaire
                </div>
              )}

              {/* Nom + Prix */}
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-2">{plan.name}</h2>
                <div className="flex items-end gap-1.5">
                  {plan.promoPrice ? (
                    <>
                      <span className="text-4xl font-bold text-white leading-none">{plan.promoPrice}€</span>
                      <span className="text-[#666666] mb-0.5 line-through text-sm ml-1">{plan.price}€</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-white leading-none">
                      {plan.price === 0 ? "Gratuit" : `${plan.price}€`}
                    </span>
                  )}
                  {plan.price > 0 && (
                    <span className="text-[#666666] mb-0.5 text-sm">/mois</span>
                  )}
                </div>
                {plan.promoPrice && (
                  <p className="text-xs text-[#22C55E] mt-1.5 font-semibold">
                    Offre de lancement · puis {plan.price}€/mois
                  </p>
                )}
                <p className="text-sm text-[#aaaaaa] mt-2">
                  {plan.searches} recherches / mois
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3 flex-1 mb-7">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-[#aaaaaa]">
                    <Check className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                    {feature}
                  </li>
                ))}
                {plan.searches > 0 && (
                  <li className="flex items-start gap-2.5 text-sm text-[#aaaaaa]">
                    <Check className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                    Jusqu&apos;à {(plan.searches * 60).toLocaleString("fr-FR")} numéros estimés/mois
                  </li>
                )}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleSubscribe(plan.id, plan.stripePriceId)}
                disabled={loading === plan.id}
                className={`
                  w-full flex items-center justify-center gap-2 py-3 rounded-[12px] font-bold text-sm transition-all
                  disabled:opacity-60 disabled:cursor-not-allowed min-h-[52px]
                  ${plan.highlighted
                    ? "bg-[#E5000A] hover:bg-[#CC0000] text-white shadow-[0_4px_16px_rgba(229,0,10,0.3)] hover:shadow-[0_4px_20px_rgba(229,0,10,0.45)]"
                    : "bg-[#111111] border border-[#2a2a2a] text-[#aaaaaa] hover:border-[#444444] hover:text-white hover:bg-[#1a1a1a]"
                  }
                `}
              >
                {loading === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {plan.cta}
                    {plan.highlighted && <ArrowRight className="w-4 h-4" />}
                  </>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* ── Réassurance ─────────────────────────────────── */}
        <div className="mt-14 p-6 rounded-[12px] border border-[#1a1a1a] bg-[#0d0d0d] text-center space-y-1.5 animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <p className="text-[#aaaaaa] text-sm">
            Sans engagement — résiliez à tout moment depuis votre espace client.
          </p>
          <p className="text-[#666666] text-xs">
            Paiement sécurisé par Stripe · Données hébergées dans l&apos;UE · Une question ?{" "}
            <a href="mailto:contact@leadvibe.fr" className="text-[#aaaaaa] hover:text-white underline">contact@leadvibe.fr</a>
          </p>
        </div>
      </main>
    </div>
  );
}
