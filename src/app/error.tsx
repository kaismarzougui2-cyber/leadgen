"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-6">
      <div className="text-center space-y-5 max-w-md">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-7 h-7 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Une erreur est survenue</h1>
        <p className="text-[#aaaaaa] text-sm">
          Nos équipes ont été notifiées. Réessayez, et si le problème persiste,
          contactez-nous à{" "}
          <a href="mailto:contact@leadvibe.fr" className="text-[#E5000A] hover:underline">
            contact@leadvibe.fr
          </a>
          .
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] text-white font-semibold px-5 py-2.5 rounded-[10px] transition-colors text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-[#111111] border border-[#2a2a2a] hover:border-[#444444] text-[#aaaaaa] hover:text-white font-medium px-5 py-2.5 rounded-[10px] transition-colors text-sm"
          >
            <Home className="w-4 h-4" />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
