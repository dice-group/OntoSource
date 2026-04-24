import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "success" | "warning" | "error" | "neutral" | "info";
  size?: "sm" | "md";
  dot?: boolean;
}

const variantClasses = {
  primary: "bg-[#EBF3FC] text-[#2A5988] border border-[#B8D4EE]",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  error: "bg-red-50 text-red-700 border border-red-200",
  neutral: "bg-slate-100 text-slate-600 border border-slate-200",
  info: "bg-sky-50 text-sky-700 border border-sky-200",
};

const dotColors = {
  primary: "bg-[#3B78B8]",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  neutral: "bg-slate-400",
  info: "bg-sky-500",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs rounded-md",
  md: "px-2.5 py-1 text-xs rounded-lg",
};

export default function Badge({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 font-medium",
        variantClasses[variant],
        sizeClasses[size],
      ].join(" ")}
    >
      {dot && (
        <span
          className={["w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant]].join(
            " "
          )}
        />
      )}
      {children}
    </span>
  );
}
