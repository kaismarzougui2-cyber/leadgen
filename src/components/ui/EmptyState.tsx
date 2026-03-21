import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center py-20 px-6 ${className}`}
    >
      {/* Icône dans un cercle */}
      <div className="w-16 h-16 rounded-full bg-[#0d0d0d] border border-[#1a1a1a] flex items-center justify-center mb-5">
        <Icon className="w-7 h-7 text-[#333333]" />
      </div>

      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-[#666666] max-w-xs leading-relaxed">{description}</p>

      {action && (
        <div className="mt-6">
          {action.href ? (
            <a
              href={action.href}
              className="inline-flex items-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] text-white text-sm font-semibold px-5 py-2.5 rounded-[12px] transition-colors"
            >
              {action.label}
            </a>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 bg-[#E5000A] hover:bg-[#CC0000] text-white text-sm font-semibold px-5 py-2.5 rounded-[12px] transition-colors"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
