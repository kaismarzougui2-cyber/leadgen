"use client";

import { useState } from "react";
import {
  Zap,
  LogOut,
  CreditCard,
  BarChart3,
  Mail,
  ChevronRight,
  Loader2,
  CheckCircle,
  Key,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import MobileNav from "@/components/ui/MobileNav";
import Sidebar from "@/components/ui/Sidebar";

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-[#111111] text-[#666666] border-[#2a2a2a]",
  starter: "bg-[#160002] text-[#E5000A] border-[#3a0002]",
  growth: "bg-[#160002] text-[#E5000A] border-[#3a0002]",
  pro: "bg-[#160002] text-[#E5000A] border-[#3a0002]",
};

interface Props {
  user: { email: string; id: string };
  plan: string;
  searchesUsed: number;
  searchesLimit: number;
  periodEnd: string | null;
  hasStripe: boolean;
  prospectsCount: number;
}

export default function AccountClient({
  user,
  plan,
  searchesUsed,
  searchesLimit,
  periodEnd,
  hasStripe,
  prospectsCount,
}: Props) {
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function handleStripePortal() {
    setPortalLoading(true);
    setPortalError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setPortalError(data.error ?? "Impossible d'accéder au portail.");
      }
    } catch {
      setPortalError("Erreur réseau. Réessayez.");
    } finally {
      setPortalLoading(false);
    }
  }

  async function handleResetPassword() {
    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setResetLoading(false);
    setResetSent(true);
  }

  const usagePct = searchesLimit > 0
    ? Math.min(100, Math.round((searchesUsed / searchesLimit) * 100))
    : 0;
  const periodEndFormatted = periodEnd
    ? new Date(periodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-black flex flex-col pt-14 sm:pt-0 sm:pl-56">
      <Sidebar
        currentPage="account"
        onLogout={handleLogout}
        userEmail={user.email}
        plan={plan}
        searchesUsed={searchesUsed}
        searchesLimit={searchesLimit}
      />
      <MobileNav currentPage="account" onLogout={handleLogout} plan={plan} />

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Mon compte</h1>
          <p className="text-[#aaaaaa] mt-1">{user.email}</p>
        </div>

        {/* Plan & Usage */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-[#E5000A]" />
              <h2 className="text-lg font-semibold text-white">Mon abonnement</h2>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${PLAN_COLORS[plan] ?? PLAN_COLORS.free}`}>
              {PLAN_LABELS[plan] ?? plan}
            </span>
          </div>

          {/* Usage bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[#aaaaaa]">Recherches ce mois</span>
              <span className="text-white font-medium">{searchesUsed} / {searchesLimit}</span>
            </div>
            <div className="w-full h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-[#E5000A]"}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className="text-xs text-[#666666]">
              {searchesLimit - searchesUsed} recherche{searchesLimit - searchesUsed !== 1 ? "s" : ""} restante{searchesLimit - searchesUsed !== 1 ? "s" : ""}
              {periodEndFormatted ? ` · Renouvellement le ${periodEndFormatted}` : ""}
            </p>
          </div>

          {/* Prospects count */}
          <div className="flex items-center justify-between py-3 border-t border-[#1a1a1a]">
            <span className="text-sm text-[#aaaaaa]">Prospects dans le CRM</span>
            <span className="text-white font-semibold">{prospectsCount}</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {hasStripe ? (
              <button
                onClick={handleStripePortal}
                disabled={portalLoading}
                className="flex items-center justify-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-[12px] transition-colors text-sm"
              >
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Gérer mon abonnement
              </button>
            ) : (
              <Link
                href="/pricing"
                className="flex items-center justify-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] text-white font-medium px-4 py-2.5 rounded-[12px] transition-colors text-sm"
              >
                <Zap className="w-4 h-4" />
                Passer à un plan payant
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {portalError && (
            <p className="text-red-400 text-sm">{portalError}</p>
          )}
        </div>

        {/* Sécurité */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-[#E5000A]" />
            <h2 className="text-lg font-semibold text-white">Sécurité</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-[#1a1a1a]">
            <div>
              <p className="text-sm font-medium text-white">Adresse email</p>
              <p className="text-sm text-[#aaaaaa]">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Mot de passe</p>
              <p className="text-sm text-[#aaaaaa]">Envoyer un lien de réinitialisation par email</p>
            </div>
            <button
              onClick={handleResetPassword}
              disabled={resetLoading || resetSent}
              className="flex items-center gap-2 bg-[#141414] border border-[#2a2a2a] hover:border-[#444444] text-[#888888] hover:text-[#cccccc] disabled:opacity-60 text-sm font-medium px-4 py-2 rounded-full transition-colors whitespace-nowrap"
            >
              {resetSent ? (
                <>
                  <CheckCircle className="w-4 h-4 text-[#22C55E]" />
                  Email envoyé !
                </>
              ) : resetLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Changer le mot de passe
                </>
              )}
            </button>
          </div>
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-[#666666] hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </main>
    </div>
  );
}
