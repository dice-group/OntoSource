import Link from "next/link";

interface LogoProps {
  size?: "small" | "medium" | "large";
  showText?: boolean;
  clickable?: boolean;
}

export default function Logo({
  size = "medium",
  showText = true,
  clickable = true,
}: LogoProps) {
  const sizeClasses = {
    small: { icon: "w-7 h-7 text-sm", text: "text-base" },
    medium: { icon: "w-9 h-9 text-lg", text: "text-lg" },
    large: { icon: "w-12 h-12 text-xl", text: "text-xl" },
  };

  const classes = sizeClasses[size];

  const logoContent = (
    <div className="flex items-center gap-3 group">
      <div
        className={`flex items-center justify-center ${classes.icon} rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 text-white font-bold shadow-sm group-hover:shadow-md transition-shadow duration-200`}
      >
        O
      </div>
      {showText && (
        <div className="flex flex-col">
          <h1
            className={`${classes.text} font-semibold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors duration-200`}
          >
            OntoSource
          </h1>
          <p className="text-xs text-gray-500 leading-tight">
            Ontology Manager
          </p>
        </div>
      )}
    </div>
  );

  if (clickable) {
    return <Link href="/">{logoContent}</Link>;
  }

  return logoContent;
}

