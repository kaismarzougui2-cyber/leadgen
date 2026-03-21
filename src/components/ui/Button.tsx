"use client";

import { Loader2 } from "lucide-react";
import React from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "success";
type Size    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-[#E5000A] hover:bg-[#CC0000] text-white font-semibold shadow-[0_4px_16px_rgba(229,0,10,0.2)] hover:shadow-[0_4px_20px_rgba(229,0,10,0.35)]",
  secondary:
    "bg-[#0d0d0d] hover:bg-[#111111] border border-[#2a2a2a] hover:border-[#444444] text-[#cccccc] hover:text-white font-medium",
  ghost:
    "bg-transparent hover:bg-[#111111] text-[#aaaaaa] hover:text-white font-medium",
  danger:
    "bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 font-medium",
  success:
    "bg-[#22C55E] hover:bg-[#16a34a] text-white font-semibold shadow-[0_4px_16px_rgba(34,197,94,0.2)]",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-xs px-3 py-2    gap-1.5 rounded-[9px]  min-h-[36px]",
  md: "text-sm px-4 py-2.5  gap-2   rounded-[9px]  min-h-[40px]",
  lg: "text-sm px-6 py-3    gap-2   rounded-[12px] min-h-[48px]",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  iconRight,
  fullWidth = false,
  children,
  disabled,
  className = "",
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center
        ${SIZE_CLASSES[size]}
        ${VARIANT_CLASSES[variant]}
        transition-all duration-150
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children && <span>{children}</span>}
      {!loading && iconRight && <span className="shrink-0 ml-auto">{iconRight}</span>}
    </button>
  );
}
