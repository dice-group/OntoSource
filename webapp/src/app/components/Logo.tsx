import Link from "next/link";

interface LogoProps {
  size?: "small" | "medium" | "large";
  showText?: boolean;
  clickable?: boolean;
  inverted?: boolean;
}

export default function Logo({
  size = "medium",
  showText = true,
  clickable = true,
  inverted = true,
}: LogoProps) {
  const sizeMap = {
    small: { wrapper: "w-7 h-7", text: "text-sm", sub: "hidden" },
    medium: { wrapper: "w-8 h-8", text: "text-base", sub: "text-xs" },
    large: { wrapper: "w-10 h-10", text: "text-lg", sub: "text-xs" },
  };
  const s = sizeMap[size];

  const logoContent = (
    <div className="flex items-center gap-2.5">
      <div
        className={[
          s.wrapper,
          "rounded-lg flex items-center justify-center font-bold shadow-sm",
          inverted
            ? "bg-white text-[#3B78B8]"
            : "bg-[#3B78B8] text-white",
        ].join(" ")}
      >
        <span className={s.text}>O</span>
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span
            className={[
              s.text,
              "font-semibold tracking-tight",
              inverted ? "text-white" : "text-slate-900",
            ].join(" ")}
          >
            OntoSource
          </span>
          <span
            className={[
              s.sub,
              "font-normal mt-0.5",
              inverted ? "text-white/60" : "text-slate-500",
            ].join(" ")}
          >
            Ontology Manager
          </span>
        </div>
      )}
    </div>
  );

  if (clickable) {
    return <Link href="/">{logoContent}</Link>;
  }
  return logoContent;
}
