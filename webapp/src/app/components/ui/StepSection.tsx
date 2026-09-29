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
  title,
  description,
  children,
  className = "",
  action,
}: StepSectionProps) {
  return (
    <div
      className={[
        "step-section",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="step-header">
        <div className="step-heading-group">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && (
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className="step-body">{children}</div>
    </div>
  );
}
