"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Zap, Users, BarChart2, X, Settings, LogOut, Menu } from "lucide-react";

type Page = "dashboard" | "booster" | "crm" | "analytics";

const TABS = [
  { page: "dashboard" as Page, href: "/dashboard", icon: Search,   label: "Recherche" },
  { page: "booster"   as Page, href: "/booster",   icon: Zap,      label: "Booster"   },
  { page: "crm"       as Page, href: "/crm",       icon: Users,    label: "CRM"       },
  { page: "analytics" as Page, href: "/analytics", icon: BarChart2, label: "Analytics" },
];

interface Props {
  currentPage: Page;
  onLogout: () => void;
  plan?: string;
  isStaff?: boolean;
}

export default function MobileNav({ currentPage, onLogout, plan, isStaff }: Props) {
  const [open, setOpen] = useState(false);

  // Close menu when navigating
  useEffect(() => { setOpen(false); }, [currentPage]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* ── Bottom tab bar ── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-sm border-t border-[#1a1a1a] flex">
        {TABS.map(({ page, href, icon: Icon, label }) => {
          const active = currentPage === page;
          return (
            <Link
              key={page}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] transition-colors ${
                active ? "text-[#E5000A] bg-[#160002]" : "text-[#666666] active:bg-[#111111]"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className={`text-xs ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
            </Link>
          );
        })}

        {/* Menu button */}
        <button
          onClick={() => setOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] text-[#666666] active:bg-[#111111]"
        >
          <Menu className="w-5 h-5" />
          <span className="text-xs font-medium">Menu</span>
        </button>
      </div>

      {/* ── Slide-up menu ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="sm:hidden fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-[70] bg-[#0d0d0d] border-t border-[#1a1a1a] rounded-t-[20px] animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-[#2a2a2a]" />
            </div>

            {/* Close */}
            <div className="flex items-center justify-between px-5 py-3">
              <span className="text-white font-semibold text-base">Navigation</span>
              <button onClick={() => setOpen(false)} className="p-2 text-[#666666] hover:text-white rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* All pages */}
            <nav className="px-4 pb-2 space-y-1">
              {TABS.map(({ page, href, icon: Icon, label }) => {
                const active = currentPage === page;
                return (
                  <Link
                    key={page}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-[12px] transition-colors ${
                      active
                        ? "bg-[#160002] text-[#E5000A]"
                        : "text-[#aaaaaa] hover:bg-[#111111] hover:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{label}</span>
                    {active && (
                      <span className="ml-auto text-xs bg-[#E5000A]/15 text-[#E5000A] px-2 py-0.5 rounded-full border border-[#E5000A]/25">
                        Actif
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Divider */}
            <div className="mx-4 my-2 border-t border-[#1a1a1a]" />

            {/* Secondary actions */}
            <div className="px-4 pb-2 space-y-1">
              {(plan === "free" && !isStaff) && (
                <Link
                  href="/pricing"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] bg-[#E5000A]/10 text-[#E5000A] hover:bg-[#E5000A]/15 transition-colors"
                >
                  <Zap className="w-5 h-5" />
                  <span className="font-semibold">Passer au plan Pro</span>
                </Link>
              )}
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] text-[#aaaaaa] hover:bg-[#111111] hover:text-white transition-colors"
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Mon compte</span>
                {isStaff && (
                  <span className="ml-auto text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Staff
                  </span>
                )}
              </Link>
              <button
                onClick={() => { setOpen(false); onLogout(); }}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-[12px] text-[#666666] hover:bg-[#111111] hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Déconnexion</span>
              </button>
            </div>

            {/* Safe area bottom padding */}
            <div className="h-6" />
          </div>
        </>
      )}
    </>
  );
}
