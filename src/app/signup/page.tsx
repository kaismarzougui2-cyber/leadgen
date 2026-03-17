"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, Zap, Check } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function SignupForm() {
  const searchParams = useSearchParams();
  const priceId = searchParams.get("priceId");
  // Si un priceId est fourni, après confirmation email → auto-checkout direct
  const redirectTo = priceId ? `/go/${priceId}` : (searchParams.get("redirect") ?? "/dashboard");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        },
      });
      if (error) throw error;
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    const next = redirectTo !== "/dashboard" ? `?next=${encodeURIComponent(redirectTo)}` : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${next}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto">
          <Check className="w-7 h-7 text-emerald-400" />
        </div>
        <h2 className="text-xl font-bold text-white">Vérifiez votre email</h2>
        <p className="text-slate-400 text-sm max-w-xs mx-auto">
          Un lien de confirmation a été envoyé à <span className="text-white font-medium">{email}</span>. Cliquez dessus pour activer votre compte et accéder au paiement.
        </p>
        <p className="text-slate-500 text-xs">Vérifiez aussi vos spams.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Google */}
      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium py-3 px-4 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continuer avec Google
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/10" />
        <span className="text-slate-500 text-xs">ou</span>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="vous@example.com"
              className="w-full pl-10 pr-4 py-3 bg-[#0F172A] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-slate-300 mb-1.5">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full pl-10 pr-4 py-3 bg-[#0F172A] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#8B5CF6] focus:ring-1 focus:ring-[#8B5CF6] transition-colors text-sm"
            />
          </div>
          <p className="text-xs text-slate-500 mt-1">Minimum 6 caractères</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer mon compte et payer"}
        </button>
      </form>

      <p className="text-center text-sm text-slate-400">
        Déjà un compte ?{" "}
        <Link
          href={`/?redirect=${encodeURIComponent(redirectTo)}`}
          className="text-[#8B5CF6] hover:underline font-medium"
        >
          Se connecter
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
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
        <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
          Tarifs
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-full px-4 py-1.5 text-sm text-[#8B5CF6] mb-2">
              <Zap className="w-3.5 h-3.5" />
              Inscription rapide
            </div>
            <h1 className="text-3xl font-bold text-white">Créez votre compte</h1>
            <p className="text-slate-400 text-sm">
              Moins d&apos;une minute pour accéder à votre abonnement.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-8 shadow-2xl">
            <Suspense fallback={<div className="h-48 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>}>
              <SignupForm />
            </Suspense>
          </div>

          <p className="text-center text-xs text-slate-600">
            En créant un compte, vous acceptez nos{" "}
            <Link href="/cgu" className="hover:text-slate-400 transition-colors underline">CGU</Link>{" "}
            et notre{" "}
            <Link href="/confidentialite" className="hover:text-slate-400 transition-colors underline">politique de confidentialité</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
