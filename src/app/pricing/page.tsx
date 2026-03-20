"use client";

import { Zap, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { PLANS } from "@/lib/plans";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
      {/* Navbar */}
      <nav className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[9px] bg-[#E5000A] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-white">LeadGen</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-[#aaaaaa] hover:text-white transition-colors"
        >
          Se connecter
        </Link>
      </nav>

      <main className="flex-1 px-6 py-20 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#160002] border border-[#3a0002] rounded-full px-4 py-1.5 text-sm text-[#E5000A]">
            <Zap className="w-3.5 h-3.5" />
            Tarifs simples, sans surprise
          </div>
          <h1 className="text-4xl font-bold text-white">
            Choisissez votre plan
          </h1>
          <p className="text-[#aaaaaa] text-lg max-w-xl mx-auto">
            Commencez gratuitement. Passez à un plan payant quand vous êtes
            prêt à scaler votre prospection.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-[12px] border border-red-500/40 bg-red-500/10 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-[12px] border p-8 ${
                plan.highlighted
                  ? "border-[#E5000A] bg-[#160002] shadow-lg shadow-[#E5000A]/20"
                  : "border-[#1a1a1a] bg-[#0d0d0d]"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#E5000A] text-white text-xs font-semibold px-4 py-1 rounded-full">
                  Populaire
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-lg font-bold text-white mb-1">
                  {plan.name}
                </h2>
                <div className="flex items-end gap-1">
                  {plan.promoPrice ? (
                    <>
                      <span className="text-4xl font-bold text-white">{plan.promoPrice}€</span>
                      <span className="text-[#aaaaaa] mb-1 line-through text-sm ml-1">{plan.price}€</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-white">
                      {plan.price === 0 ? "Gratuit" : `${plan.price}€`}
                    </span>
                  )}
                  {plan.price > 0 && (
                    <span className="text-[#aaaaaa] mb-1">/mois</span>
                  )}
                </div>
                {plan.promoPrice && (
                  <p className="text-xs text-emerald-400 mt-1 font-medium">
                    Offre de lancement · puis {plan.price}€/mois
                  </p>
                )}
                <p className="text-sm text-[#aaaaaa] mt-1">
                  {plan.searches} recherches / mois
                </p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-[#aaaaaa]">
                    <Check className="w-4 h-4 text-[#22C55E] shrink-0" />
                    {feature}
                  </li>
                ))}
                {plan.searches > 0 && (
                  <li className="flex items-center gap-2.5 text-sm text-[#aaaaaa]">
                    <Check className="w-4 h-4 text-[#22C55E] shrink-0" />
                    Jusqu&apos;à {(plan.searches * 60).toLocaleString("fr-FR")} numéros de téléphone estimés
                  </li>
                )}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id, plan.stripePriceId)}
                disabled={loading === plan.id}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-[12px] font-semibold text-sm transition-colors disabled:opacity-60 ${
                  plan.highlighted
                    ? "bg-[#E5000A] hover:bg-[#CC0000] text-white"
                    : "bg-[#141414] border border-[#2a2a2a] text-[#888888] hover:border-[#444444] hover:text-[#cccccc]"
                }`}
              >
                {loading === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Margin callout */}
        <div className="mt-16 p-6 rounded-[12px] border border-[#1a1a1a] bg-[#0d0d0d] text-center space-y-2">
          <p className="text-[#aaaaaa] text-sm">
            Tarification transparente — coût opérationnel estimé par recherche :{" "}
            <span className="text-white font-medium">~0,03€</span> (Google Places API)
          </p>
          <p className="text-[#666666] text-xs">
            Marge brute estimée — Starter : <span className="text-[#22C55E]">~85%</span> · Pro :{" "}
            <span className="text-[#22C55E]">~74%</span>
          </p>
        </div>
      </main>
    </div>
  );
}
