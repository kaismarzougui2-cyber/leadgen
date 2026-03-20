"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Lock, Zap } from "lucide-react";
import Link from "next/link";

type Mode = "login" | "signup";

export default function AuthForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const supabase = createClient();
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setMessage({
          type: "success",
          text: "Compte créé ! Vérifiez votre email pour confirmer votre inscription.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = redirectTo;
      }
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Une erreur est survenue.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    const supabase = createClient();
    const next = redirectTo !== "/dashboard" ? `?next=${encodeURIComponent(redirectTo)}` : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${next}`,
      },
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
    }
  }

  return (
    <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] p-8 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-[9px] bg-[#E5000A] flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-xl font-bold text-white">LeadGen</span>
      </div>

      <h2 className="text-2xl font-bold text-white mb-1">
        {mode === "login" ? "Bon retour !" : "Créer un compte"}
      </h2>
      <p className="text-[#aaaaaa] text-sm mb-6">
        {mode === "login"
          ? "Connectez-vous pour accéder à votre espace."
          : "Commencez gratuitement dès maintenant."}
      </p>

      {/* Google OAuth */}
      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium py-2.5 px-4 rounded-[9px] hover:bg-gray-100 transition-colors mb-4 disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continuer avec Google
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-[#1a1a1a]" />
        <span className="text-[#666666] text-xs">ou</span>
        <div className="flex-1 h-px bg-[#1a1a1a]" />
      </div>

      {/* Email/Password form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-[#aaaaaa] mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="vous@example.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[9px] text-white placeholder-[#444444] focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A] transition-colors text-sm"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm text-[#aaaaaa]">Mot de passe</label>
            {mode === "login" && (
              <Link href="/auth/forgot-password" className="text-xs text-[#E5000A] hover:underline">
                Mot de passe oublié ?
              </Link>
            )}
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full pl-10 pr-4 py-2.5 bg-[#0d0d0d] border border-[#1a1a1a] rounded-[9px] text-white placeholder-[#444444] focus:outline-none focus:border-[#E5000A] focus:ring-1 focus:ring-[#E5000A] transition-colors text-sm"
            />
          </div>
        </div>

        {message && (
          <div
            className={`p-3 rounded-[9px] text-sm ${
              message.type === "success"
                ? "bg-[#001a05] border border-[#22C55E]/30 text-[#22C55E]"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#E5000A] hover:bg-[#CC0000] text-white font-semibold py-2.5 px-4 rounded-[9px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : mode === "login" ? (
            "Se connecter"
          ) : (
            "Créer mon compte"
          )}
        </button>
      </form>

      {/* Toggle mode */}
      <p className="text-center text-sm text-[#aaaaaa] mt-4">
        {mode === "login" ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage(null);
          }}
          className="text-[#E5000A] hover:underline font-medium"
        >
          {mode === "login" ? "S'inscrire" : "Se connecter"}
        </button>
      </p>
    </div>
  );
}
