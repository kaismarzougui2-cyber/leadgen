import React from "react";

type InputSize = "sm" | "md" | "lg";

type InputHTMLPropsWithoutSize = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">;

interface InputProps extends InputHTMLPropsWithoutSize {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  size?: InputSize;
  fullWidth?: boolean;
}

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: "pl-3 py-2   text-xs  rounded-[9px]  min-h-[36px]",
  md: "pl-4 py-2.5 text-sm  rounded-[12px] min-h-[44px]",
  lg: "pl-4 py-3.5 text-sm  rounded-[12px] min-h-[52px]",
};

const SIZE_ICON_OFFSET: Record<InputSize, string> = {
  sm: "pl-8",
  md: "pl-10",
  lg: "pl-11",
};

const SIZE_ICON_POS: Record<InputSize, string> = {
  sm: "left-2.5 w-3.5 h-3.5",
  md: "left-3   w-4   h-4",
  lg: "left-4   w-4   h-4",
};

export function Input({
  label,
  error,
  hint,
  icon,
  iconRight,
  size = "md",
  fullWidth = true,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? "w-full" : ""}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-[#aaaaaa]"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {/* Icône gauche */}
        {icon && (
          <span
            className={`absolute top-1/2 -translate-y-1/2 text-[#666666] pointer-events-none ${SIZE_ICON_POS[size]}`}
          >
            {icon}
          </span>
        )}

        <input
          id={inputId}
          className={`
            bg-[#0d0d0d] border text-white placeholder-[#444444]
            focus:outline-none focus:ring-1 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
            ${SIZE_CLASSES[size]}
            ${icon ? SIZE_ICON_OFFSET[size] : ""}
            ${iconRight ? "pr-10" : "pr-4"}
            ${
              error
                ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/30"
                : "border-[#1a1a1a] focus:border-[#E5000A] focus:ring-[#E5000A]/20"
            }
            ${fullWidth ? "w-full" : ""}
            ${className}
          `}
          {...props}
        />

        {/* Icône droite */}
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#666666] pointer-events-none">
            {iconRight}
          </span>
        )}
      </div>

      {/* Message d'erreur */}
      {error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          {error}
        </p>
      )}

      {/* Hint */}
      {!error && hint && (
        <p className="text-xs text-[#666666]">{hint}</p>
      )}
    </div>
  );
}
