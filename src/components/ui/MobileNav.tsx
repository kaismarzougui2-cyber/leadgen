"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Search, Zap, Users, BarChart2, X, Settings, LogOut, ChevronDown } from "lucide-react";

type Page = "dashboard" | "booster" | "crm" | "analytics";

const TABS = [
  { page: "dashboard" as Page, href: "/dashboard", icon: Search,   label: "Recherche" },
  { page: "booster"   as Page, href: "/booster",   icon: Zap,      label: "Booster"   },
  { page: "crm"       as Page, href: "/crm",       icon: Users,    label: "CRM"       },
  { page: "analytics" as Page, href: "/analytics", icon: BarChart2, label: "Analytics" },
];

const PAGE_LABELS: Record<Page, string> = {
  dashboard: "Recherche",
  booster:   "Booster",
  crm:       "CRM",
  analytics:  "Analytics",
};

interface Props {
  currentPage: Page;
  onLogout: () => void;
  plan?: string;
  isStaff?: boolean;
}

export default function MobileNav({ currentPage, onLogout, plan, isStaff }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setOpen(false); }, [currentPage]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="sm:hidden fixed top-0 left-0 right-0 z-50">
      {/* ── Top header bar ── */}
      <div className="bg-black/95 backdrop-blur-sm border-b border-[#1a1a1a] px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[8px] bg-[#E5000A] flex items-center justify-center shadow-[0_0_10px_rgba(229,0,10,0.3)]">
            <Zap className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">LeadGen</span>
        </div>

        {/* Current page + menu toggle */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-sm font-medium text-white bg-[#111111] border border-[#1a1a1a] active:bg-[#1a1a1a]"
        >
          <span className="text-[#aaaaaa]">{PAGE_LABELS[currentPage]}</span>
          <ChevronDown className={`w-4 h-4 text-[#555555] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* ── Dropdown menu ── */}
      {open && (
        <div className="bg-[#0d0d0d] border-b border-[#1a1a1a] animate-slide-down shadow-xl">
          {/* Close row */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#111111]">
            <span className="text-xs text-[#555555] font-medium uppercase tracking-wider">Navigation</span>
            <button onClick={() => setOpen(false)} className="p-1.5 text-[#555555] hover:text-white rounded-lg">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Pages */}
          <nav className="px-3 py-2 space-y-0.5">
            {TABS.map(({ page, href, icon: Icon, label }) => {
              const active = currentPage === page;
              return (
                <Link
                  key={page}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-[10px] transition-colors ${
                    active
                      ? "bg-[#160002] text-[#E5000A]"
                      : "text-[#aaaaaa] hover:bg-[#111111] hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="font-medium text-sm">{label}</span>
                  {active && (
                    <span className="ml-auto text-xs bg-[#E5000A]/15 text-[#E5000A] px-2 py-0.5 rounded-full border border-[#E5000A]/25">
                      Actif
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mx-3 border-t border-[#1a1a1a]" />

          {/* Secondary */}
          <div className="px-3 py-2 space-y-0.5">
            {(plan === "free" && !isStaff) && (
              <Link
                href="/pricing"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-[10px] bg-[#E5000A]/10 text-[#E5000A] hover:bg-[#E5000A]/15 transition-colors"
              >
                <Zap className="w-4 h-4 shrink-0" />
                <span className="font-semibold text-sm">Passer au plan Pro</span>
              </Link>
            )}
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-[10px] text-[#aaaaaa] hover:bg-[#111111] hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="font-medium text-sm">Mon compte</span>
              {isStaff && (
                <span className="ml-auto text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Staff
                </span>
              )}
            </Link>
            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-[10px] text-[#666666] hover:bg-[#111111] hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="font-medium text-sm">Déconnexion</span>
            </button>
          </div>

          <div className="h-2" />
        </div>
      )}
    </div>
  );
}
