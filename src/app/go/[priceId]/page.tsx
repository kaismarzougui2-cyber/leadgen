"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";

export default function AutoCheckoutPage() {
  const { priceId } = useParams<{ priceId: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startCheckout() {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priceId }),
        });

        if (res.status === 401) {
          router.push(`/signup?priceId=${priceId}`);
          return;
        }

        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
        } else {
          setError(data.error ?? "Une erreur est survenue.");
        }
      } catch {
        setError("Impossible de joindre le serveur. Réessayez.");
      }
    }

    startCheckout();
  }, [priceId, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6 text-red-400" />
          </div>
          <p className="text-white font-semibold">{error}</p>
          <button
            onClick={() => router.push("/pricing")}
            className="text-sm text-[#E5000A] hover:underline"
          >
            Retour aux tarifs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-[#160002] border border-[#3a0002] flex items-center justify-center mx-auto">
          <Loader2 className="w-6 h-6 text-[#E5000A] animate-spin" />
        </div>
        <p className="text-white font-semibold">Préparation du paiement...</p>
        <p className="text-[#aaaaaa] text-sm">Vous allez être redirigé vers Stripe.</p>
      </div>
    </div>
  );
}
