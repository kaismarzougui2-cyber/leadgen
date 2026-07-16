import { Zap, Search, Users, BarChart2 } from "lucide-react";

const NAV_ITEMS = [
  { icon: Search,    label: "Recherche" },
  { icon: Zap,       label: "Booster"   },
  { icon: Users,     label: "CRM"       },
  { icon: BarChart2, label: "Analytics" },
];

function Sk({ className }: { className: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export default function PageLoader({ variant = "default" }: { variant?: "crm" | "analytics" | "default" }) {
  return (
    <div className="min-h-screen bg-black flex flex-col pt-14 sm:pt-0 sm:pl-56">

      {/* ── Mobile header shell ── */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-black/95 backdrop-blur-sm border-b border-[#1a1a1a] px-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-[#E5000A] flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">LeadVibe</span>
        </div>
        <div className="w-28 h-8 rounded-[9px] skeleton" />
      </div>

      {/* ── Desktop sidebar shell ── */}
      <aside className="hidden sm:flex flex-col fixed left-0 top-0 h-screen w-56 border-r border-[#1a1a1a] bg-black z-40">
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#1a1a1a]">
          <div className="w-8 h-8 rounded-[9px] bg-[#E5000A] flex items-center justify-center shadow-[0_0_12px_rgba(229,0,10,0.3)]">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-white tracking-tight">LeadVibe</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[#2a2a2a]">
              <Icon className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-[#1a1a1a] space-y-2">
          <div className="h-3 w-32 skeleton rounded-lg mx-1 mb-3" />
          <div className="h-9 rounded-[10px] skeleton" />
          <div className="h-9 rounded-[10px] skeleton" />
        </div>
      </aside>

      {/* ── Main content skeleton ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-10 space-y-8">

        {/* Page title */}
        <div className="space-y-3">
          <Sk className="h-9 w-52" />
          <Sk className="h-4 w-72" />
        </div>

        {variant === "analytics" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Sk key={i} className="h-28" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Sk className="h-64" />
              <Sk className="h-64" />
            </div>
            <Sk className="h-64" />
          </>
        )}

        {variant === "crm" && (
          <>
            <div className="flex gap-2 flex-wrap">
              {[...Array(5)].map((_, i) => <Sk key={i} className="h-9 w-24" />)}
            </div>
            <div className="space-y-3">
              {[...Array(7)].map((_, i) => <Sk key={i} className="h-[88px]" />)}
            </div>
          </>
        )}

        {variant === "default" && (
          <>
            <div className="flex gap-3">
              <Sk className="h-12 flex-1" />
              <Sk className="h-12 w-36" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <Sk key={i} className="h-44" />)}
            </div>
          </>
        )}

      </main>
    </div>
  );
}
