"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Mail, Zap, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-[12px] p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-[9px] bg-[#E5000A] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-bold text-white">LeadVibe</span>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#001a05] border border-[#22C55E]/30 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-6 h-6 text-[#22C55E]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Email envoyé</h2>
              <p className="text-[#aaaaaa] text-sm mb-6">
                Vérifiez votre boîte mail. Un lien de réinitialisation a été envoyé à{" "}
                <span className="text-white font-medium">{email}</span>.
              </p>
              <Link href="/" className="text-[#E5000A] hover:underline text-sm font-medium">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-1">Mot de passe oublié</h2>
              <p className="text-[#aaaaaa] text-sm mb-6">
                Entrez votre email et nous vous enverrons un lien de réinitialisation.
              </p>

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

                {error && (
                  <div className="p-3 rounded-[9px] text-sm bg-red-500/10 border border-red-500/30 text-red-400">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E5000A] hover:bg-[#CC0000] text-white font-semibold py-2.5 px-4 rounded-[9px] transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Envoyer le lien"}
                </button>
              </form>

              <Link
                href="/"
                className="flex items-center justify-center gap-1.5 mt-4 text-sm text-[#aaaaaa] hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour à la connexion
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
