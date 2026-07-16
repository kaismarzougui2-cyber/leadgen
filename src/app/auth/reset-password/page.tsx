"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Lock, Zap, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Supabase injects the session from the URL hash on load
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        // session is ready, form can proceed
      }
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
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

          {done ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#001a05] border border-[#22C55E]/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-[#22C55E]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Mot de passe mis à jour</h2>
              <p className="text-[#aaaaaa] text-sm">Redirection vers le tableau de bord…</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-1">Nouveau mot de passe</h2>
              <p className="text-[#aaaaaa] text-sm mb-6">
                Choisissez un mot de passe sécurisé pour votre compte.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-1.5">Nouveau mot de passe</label>
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

                <div>
                  <label className="block text-sm text-[#aaaaaa] mb-1.5">Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666666]" />
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      placeholder="••••••••"
                      minLength={6}
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
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mettre à jour"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
