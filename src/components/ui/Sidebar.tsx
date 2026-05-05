"use client";

import Link from "next/link";
import { Zap, Search, Users, BarChart2, Settings, LogOut } from "lucide-react";

type Page = "dashboard" | "booster" | "crm" | "analytics";

const NAV_ITEMS = [
  { page: "dashboard" as Page, href: "/dashboard", icon: Search,   label: "Recherche" },
  { page: "booster"   as Page, href: "/booster",   icon: Zap,      label: "Booster"   },
  { page: "crm"       as Page, href: "/crm",       icon: Users,    label: "CRM"       },
  { page: "analytics" as Page, href: "/analytics", icon: BarChart2, label: "Analytics" },
];

const PLAN_LABELS: Record<string, string> = {
  free: "Free", starter: "Starter", growth: "Growth", pro: "Pro",
};

interface Props {
  currentPage: Page;
  onLogout: () => void;
  userEmail?: string;
  plan?: string;
  isStaff?: boolean;
  searchesUsed?: number;
  searchesLimit?: number;
}

export default function Sidebar({ currentPage, onLogout, userEmail, plan, isStaff, searchesUsed, searchesLimit }: Props) {
  const remaining = searchesLimit !== undefined && searchesUsed !== undefined
    ? searchesLimit - searchesUsed
    : undefined;

  return (
    <aside className="hidden sm:flex flex-col fixed left-0 top-0 h-screen w-56 border-r border-[#1a1a1a] bg-black z-40">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#1a1a1a] shrink-0">
        <div className="w-8 h-8 rounded-[9px] bg-[#E5000A] flex items-center justify-center shadow-[0_0_12px_rgba(229,0,10,0.3)]">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-xl font-bold text-white tracking-tight">LeadGen</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ page, href, icon: Icon, label }) => {
          const active = currentPage === page;
          return (
            <Link
              key={page}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors ${
                active
                  ? "bg-[#160002] text-[#E5000A]"
                  : "text-[#aaaaaa] hover:bg-[#111111] hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-[#1a1a1a] space-y-1 shrink-0">
        {/* User info */}
        {userEmail && (
          <p className="text-xs text-[#555555] truncate px-3 pb-2">{userEmail}</p>
        )}

        {/* Plan / credits */}
        {isStaff ? (
          <div className="flex items-center gap-2 px-3 pb-2">
            <span className="text-xs bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">Staff</span>
            <span className="text-xs text-emerald-400 font-semibold">∞ Illimité</span>
          </div>
        ) : plan ? (
          <div className="px-3 pb-2 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-[#160002] border border-[#3a0002] text-[#E5000A] px-2 py-0.5 rounded-full font-semibold">
                {PLAN_LABELS[plan] ?? plan}
              </span>
              {plan === "free" && (
                <Link href="/pricing" className="text-xs text-[#E5000A] hover:underline font-semibold">
                  Upgrader →
                </Link>
              )}
            </div>
            {searchesUsed !== undefined && searchesLimit !== undefined && (
              <p className="text-xs text-[#555555]">
                <span className={remaining !== undefined && remaining <= 2 ? "text-amber-400 font-semibold" : "text-[#888888] font-medium"}>
                  {searchesUsed}/{searchesLimit}
                </span>{" "}
                recherches
              </p>
            )}
          </div>
        ) : null}

        {/* Account */}
        <Link
          href="/account"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm text-[#aaaaaa] hover:bg-[#111111] hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4 shrink-0" />
          Mon compte
        </Link>

        {/* Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm text-[#666666] hover:bg-[#111111] hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
