import Link from "next/link";
import { Zap, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      {/* Logo */}
      <div className="w-14 h-14 rounded-[12px] bg-[#E5000A] flex items-center justify-center mb-8 shadow-[0_0_32px_rgba(229,0,10,0.4)]">
        <Zap className="w-7 h-7 text-white" />
      </div>

      {/* 404 */}
      <p className="text-[#E5000A] text-sm font-bold tracking-widest uppercase mb-3">
        Erreur 404
      </p>
      <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4 tracking-tight">
        Page introuvable
      </h1>
      <p className="text-[#aaaaaa] text-base max-w-sm leading-relaxed mb-10">
        Cette page n&apos;existe pas ou a été déplacée.
        Pas de panique, vos prospects vous attendent.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] text-white font-bold px-6 py-3 rounded-[12px] transition-all shadow-[0_4px_16px_rgba(229,0,10,0.3)] hover:shadow-[0_4px_20px_rgba(229,0,10,0.45)] min-h-[52px]"
        >
          <Search className="w-4 h-4" />
          Faire une recherche
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 bg-[#0d0d0d] hover:bg-[#111111] border border-[#1a1a1a] hover:border-[#2a2a2a] text-[#aaaaaa] hover:text-white font-medium px-6 py-3 rounded-[12px] transition-all min-h-[52px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  );
}
