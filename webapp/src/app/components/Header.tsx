"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Edit3, Brain, Sparkles } from "lucide-react";
import Logo from "./Logo";

const NAV_LINKS = [
  {
    href: "/",
    label: "Visualize",
    icon: () => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M7,7 L10,10" strokeWidth="1.5" />
        <path d="M17,7 L14,10" strokeWidth="1.5" />
        <path d="M7,17 L10,14" strokeWidth="1.5" />
        <path d="M17,17 L14,14" strokeWidth="1.5" />
        <circle cx="4" cy="4" r="3" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
        <circle cx="20" cy="4" r="3" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
        <circle cx="4" cy="20" r="3" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
        <circle cx="20" cy="20" r="3" strokeWidth="1.5" fill="currentColor" fillOpacity="0.15" />
        <circle cx="12" cy="12" r="3" strokeWidth="1.5" fill="currentColor" fillOpacity="0.2" />
      </svg>
    ),
  },
  { href: "/edit", label: "Edit", icon: Edit3 },
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/predict", label: "Predict", icon: Brain },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full bg-[#3B78B8] shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-15 items-center justify-between py-3">
          <Logo />

          <nav
            className="flex items-center gap-1"
            role="navigation"
            aria-label="Main navigation"
          >
            {NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "relative flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    isActive
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-white/75 hover:text-white hover:bg-white/10",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className="w-3.5 h-3.5 shrink-0"
                    strokeWidth={2}
                  />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
