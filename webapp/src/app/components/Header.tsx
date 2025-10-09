"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Edit3, Brain } from "lucide-react";
import Logo from "./Logo";

export default function Header() {
  const pathname = usePathname();

  const navLinks = [
    {
      href: "/",
      label: "Visualize",
      icon: () => (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Edges first so they appear behind nodes */}
          <path d="M7,7 L10,10" strokeWidth="1.2" />
          <path d="M17,7 L14,10" strokeWidth="1.2" />
          <path d="M7,17 L10,14" strokeWidth="1.2" />
          <path d="M17,17 L14,14" strokeWidth="1.2" />

          {/* Nodes on top */}
          <circle cx="4" cy="4" r="3" strokeWidth="1.2" fill="#fff" />
          <circle cx="20" cy="4" r="3" strokeWidth="1.2" fill="#fff" />
          <circle cx="4" cy="20" r="3" strokeWidth="1.2" fill="#fff" />
          <circle cx="20" cy="20" r="3" strokeWidth="1.2" fill="#fff" />
          <circle cx="12" cy="12" r="3" strokeWidth="1.2" fill="#fff" />
        </svg>
      ),
    },
    { href: "/edit", label: "Edit", icon: Edit3 },
    { href: "/predict", label: "Predict", icon: Brain },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-gradient-to-br from-blue-50 via-white to-slate-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <Logo />

          {/* Navigation */}
          <nav
            className="flex items-center gap-2"
            role="navigation"
            aria-label="Main navigation"
          >
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors duration-200 group"
                  aria-current={isActive ? "page" : undefined}
                >
                  <Icon
                    className="w-4 h-4 transition-transform duration-200 group-hover:scale-110"
                    strokeWidth={2}
                  />
                  <span>{link.label}</span>

                  {/* Active indicator */}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-blue-600 rounded-full" />
                  )}

                  {/* Hover background */}
                  <span className="absolute inset-0 rounded-lg bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200 -z-10" />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
