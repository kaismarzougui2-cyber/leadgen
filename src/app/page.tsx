import AuthForm from "@/components/AuthForm";
import Link from "next/link";
import { Zap, Target, TrendingUp, Shield } from "lucide-react";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: <Target className="w-6 h-6 text-[#8B5CF6]" />,
    title: "Recherche ciblée",
    desc: "Trouvez des prospects par métier et ville grâce à Google Places.",
  },
  {
    icon: <Shield className="w-6 h-6 text-[#10B981]" />,
    title: "Trust Score",
    desc: "Chaque lead est scoré selon sa présence en ligne pour prioriser vos appels.",
  },
  {
    icon: <Zap className="w-6 h-6 text-[#8B5CF6]" />,
    title: "CRM intégré",
    desc: "Sauvegardez vos leads, gérez les statuts et ajoutez des notes.",
  },
  {
    icon: <TrendingUp className="w-6 h-6 text-[#10B981]" />,
    title: "ROI mesurable",
    desc: "Simulez votre chiffre d'affaires potentiel avant même de décrocher le téléphone.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0F172A] flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#8B5CF6] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-white">LeadGen</span>
        </div>
        <Link href="/pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
          Tarifs
        </Link>
      </nav>

      <main className="flex-1 flex flex-col lg:flex-row items-center gap-16 px-6 py-16 max-w-7xl mx-auto w-full">
        {/* Left – Hero */}
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center gap-2 bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 rounded-full px-4 py-1.5 text-sm text-[#8B5CF6]">
            <Zap className="w-3.5 h-3.5" />
            Propulsé par Google Places
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold text-white leading-tight">
            Trouvez vos{" "}
            <span className="text-[#8B5CF6]">prospects B2B</span>{" "}
            en quelques secondes
          </h1>

          <p className="text-lg text-slate-400 max-w-lg">
            LeadGen scanne Google Places pour vous livrer des leads qualifiés
            avec numéro de téléphone et score de confiance. Prospectez plus
            vite, convertissez mieux.
          </p>

          {/* Features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/10"
              >
                <div className="mt-0.5 shrink-0">{f.icon}</div>
                <div>
                  <p className="font-semibold text-white text-sm">{f.title}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <p className="text-slate-500 text-sm">
            🔒 Connexion sécurisée — vos données restent privées
          </p>
        </div>

        {/* Right – Auth Form */}
        <div className="w-full lg:w-[420px] shrink-0">
          <AuthForm />
        </div>
      </main>
    </div>
  );
}
