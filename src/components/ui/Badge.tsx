import React from "react";

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "neutral" | "info";
type BadgeSize    = "sm" | "md";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  primary: "bg-[#160002] border border-[#3a0002] text-[#E5000A]",
  success: "bg-[#001a05] border border-[#22C55E]/30 text-[#22C55E]",
  warning: "bg-amber-500/10 border border-amber-500/25 text-amber-400",
  danger:  "bg-red-500/10  border border-red-500/25  text-red-400",
  neutral: "bg-[#111111]   border border-[#1e1e1e]   text-[#aaaaaa]",
  info:    "bg-blue-500/10 border border-blue-500/25 text-blue-400",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "text-xs px-2    py-0.5 gap-1",
  md: "text-xs px-2.5 py-1   gap-1.5",
};

export function Badge({
  variant = "neutral",
  size = "md",
  children,
  icon,
  className = "",
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${VARIANT_CLASSES[variant]}
        ${SIZE_CLASSES[size]}
        ${className}
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}
