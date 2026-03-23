import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Variante visuelle */
  variant?: "default" | "highlighted" | "danger" | "success";
  /** Active le hover (border + shadow) */
  hoverable?: boolean;
  /** Rend la card cliquable (cursor pointer) */
  clickable?: boolean;
  onClick?: () => void;
  /** Réduit le padding */
  compact?: boolean;
  as?: React.ElementType;
}

const VARIANT_CLASSES: Record<string, string> = {
  default:     "bg-[#0d0d0d] border-[#1a1a1a]",
  highlighted: "bg-[#0d0d0d] border-[#E5000A] shadow-[0_0_0_1px_#E5000A,0_8px_32px_rgba(229,0,10,0.15)]",
  danger:      "bg-red-500/5  border-red-500/25",
  success:     "bg-[#001a05] border-[#22C55E]/25",
};

const HOVER_CLASSES = "hover:border-[#2a2a2a] hover:shadow-[0_4px_16px_rgba(0,0,0,0.4)] transition-all duration-200";

export function Card({
  children,
  className = "",
  variant = "default",
  hoverable = false,
  clickable = false,
  onClick,
  compact = false,
  as: Tag = "div",
}: CardProps) {
  return (
    <Tag
      onClick={onClick}
      className={`
        border rounded-[12px]
        ${compact ? "p-4" : "p-5 sm:p-6"}
        ${VARIANT_CLASSES[variant]}
        ${hoverable ? HOVER_CLASSES : "transition-colors duration-150"}
        ${clickable ? "cursor-pointer" : ""}
        ${className}
      `}
    >
      {children}
    </Tag>
  );
}

/* ─── Sous-composants pratiques ──────────────────────────────── */

export function CardHeader({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 mb-5 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-base font-semibold text-white leading-snug ${className}`}>
      {children}
    </h3>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function CardFooter({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 mt-5 pt-4 border-t border-[#1a1a1a] ${className}`}
    >
      {children}
    </div>
  );
}
