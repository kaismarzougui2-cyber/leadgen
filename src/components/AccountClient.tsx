"use client";

import { useState } from "react";
import {
  Zap,
  Search,
  Users,
  LogOut,
  Settings,
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

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  growth: "Growth",
  pro: "Pro",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-slate-500/20 text-slate-400 border-slate-500/30",
  starter: "bg-[#8B5CF6]/20 text-[#8B5CF6] border-[#8B5CF6]/30",
  growth: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  pro: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
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

  const usagePct = Math.min(100, Math.round((searchesUsed / searchesLimit) * 100));
  const periodEndFormatted = periodEnd
    ? new Date(periodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col pb-20 sm:pb-0">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#8B5CF6] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">LeadVibe</span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <Link href="/dashboard" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
              Recherche
            </Link>
            <Link href="/crm" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              CRM
            </Link>
            <Link href="/account" className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-white/10 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5" />
              Compte
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400 hidden sm:block">{user.email}</span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Déconnexion</span>
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0F172A] border-t border-white/10 flex">
        <Link href="/dashboard" className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-slate-400 active:bg-white/5">
          <Search className="w-5 h-5" />
          <span className="text-xs font-medium">Recherche</span>
        </Link>
        <Link href="/crm" className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-slate-400 active:bg-white/5">
          <Users className="w-5 h-5" />
          <span className="text-xs font-medium">Mon CRM</span>
        </Link>
        <Link href="/account" className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-white bg-white/10">
          <Settings className="w-5 h-5" />
          <span className="text-xs font-medium">Compte</span>
        </Link>
        <button onClick={handleLogout} className="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-slate-400 active:bg-white/5">
          <LogOut className="w-5 h-5" />
          <span className="text-xs font-medium">Déco</span>
        </button>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Mon compte</h1>
          <p className="text-slate-400 mt-1">{user.email}</p>
        </div>

        {/* Plan & Usage */}
        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-[#8B5CF6]" />
              <h2 className="text-lg font-semibold text-white">Mon abonnement</h2>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${PLAN_COLORS[plan] ?? PLAN_COLORS.free}`}>
              {PLAN_LABELS[plan] ?? plan}
            </span>
          </div>

          {/* Usage bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Recherches ce mois</span>
              <span className="text-white font-medium">{searchesUsed} / {searchesLimit}</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${usagePct >= 90 ? "bg-red-500" : usagePct >= 70 ? "bg-amber-500" : "bg-[#8B5CF6]"}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">
              {searchesLimit - searchesUsed} recherche{searchesLimit - searchesUsed !== 1 ? "s" : ""} restante{searchesLimit - searchesUsed !== 1 ? "s" : ""}
              {periodEndFormatted ? ` · Renouvellement le ${periodEndFormatted}` : ""}
            </p>
          </div>

          {/* Prospects count */}
          <div className="flex items-center justify-between py-3 border-t border-white/10">
            <span className="text-sm text-slate-400">Prospects dans le CRM</span>
            <span className="text-white font-semibold">{prospectsCount}</span>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {hasStripe ? (
              <button
                onClick={handleStripePortal}
                disabled={portalLoading}
                className="flex items-center justify-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] disabled:opacity-60 text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
              >
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                Gérer mon abonnement
              </button>
            ) : (
              <Link
                href="/pricing"
                className="flex items-center justify-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-medium px-4 py-2.5 rounded-xl transition-colors text-sm"
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
        <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Key className="w-5 h-5 text-[#8B5CF6]" />
            <h2 className="text-lg font-semibold text-white">Sécurité</h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 border-b border-white/10">
            <div>
              <p className="text-sm font-medium text-white">Adresse email</p>
              <p className="text-sm text-slate-400">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Mot de passe</p>
              <p className="text-sm text-slate-400">Envoyer un lien de réinitialisation par email</p>
            </div>
            <button
              onClick={handleResetPassword}
              disabled={resetLoading || resetSent}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              {resetSent ? (
                <>
                  <CheckCircle className="w-4 h-4 text-[#10B981]" />
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
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </main>
    </div>
  );
}
