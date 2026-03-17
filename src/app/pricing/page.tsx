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
        router.push("/?redirect=pricing");
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
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#8B5CF6] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-white">LeadGen</span>
        </Link>
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          Se connecter
        </Link>
      </nav>

      <main className="flex-1 px-6 py-20 max-w-5xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-full px-4 py-1.5 text-sm text-[#8B5CF6]">
            <Zap className="w-3.5 h-3.5" />
            Tarifs simples, sans surprise
          </div>
          <h1 className="text-4xl font-bold text-white">
            Choisissez votre plan
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Commencez gratuitement. Passez à un plan payant quand vous êtes
            prêt à scaler votre prospection.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-8 ${
                plan.highlighted
                  ? "border-[#8B5CF6] bg-[#8B5CF6]/10 shadow-lg shadow-[#8B5CF6]/20"
                  : "border-white/10 bg-white/5"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#8B5CF6] text-white text-xs font-semibold px-4 py-1 rounded-full">
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
                      <span className="text-slate-400 mb-1 line-through text-sm ml-1">{plan.price}€</span>
                    </>
                  ) : (
                    <span className="text-4xl font-bold text-white">
                      {plan.price === 0 ? "Gratuit" : `${plan.price}€`}
                    </span>
                  )}
                  {plan.price > 0 && (
                    <span className="text-slate-400 mb-1">/mois</span>
                  )}
                </div>
                {plan.promoPrice && (
                  <p className="text-xs text-emerald-400 mt-1 font-medium">
                    Offre de lancement · puis {plan.price}€/mois
                  </p>
                )}
                <p className="text-sm text-slate-400 mt-1">
                  {plan.searches} recherches / mois
                </p>
              </div>

              <ul className="space-y-3 flex-1 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-[#10B981] shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id, plan.stripePriceId)}
                disabled={loading === plan.id}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60 ${
                  plan.highlighted
                    ? "bg-[#8B5CF6] hover:bg-[#7C3AED] text-white"
                    : "bg-white/10 hover:bg-white/20 text-white"
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
        <div className="mt-16 p-6 rounded-2xl border border-white/10 bg-white/5 text-center space-y-2">
          <p className="text-slate-400 text-sm">
            Tarification transparente — coût opérationnel estimé par recherche :{" "}
            <span className="text-white font-medium">~0,03€</span> (Google Places API)
          </p>
          <p className="text-slate-500 text-xs">
            Marge brute estimée — Starter : <span className="text-[#10B981]">~85%</span> · Pro :{" "}
            <span className="text-[#10B981]">~74%</span>
          </p>
        </div>
      </main>
    </div>
  );
}
