import React from "react";

interface StepSectionProps {
  step?: number;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export default function StepSection({
  step,
  title,
  description,
  children,
  className = "",
  action,
}: StepSectionProps) {
  return (
    <div
      className={[
        "bg-white rounded-2xl border border-slate-200 shadow-sm",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {step !== undefined && (
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#3B78B8] text-white text-xs font-bold shrink-0">
              {step}
            </span>
          )}
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
