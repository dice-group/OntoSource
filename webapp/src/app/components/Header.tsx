"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Edit3, Brain, Sparkles, Network, ArrowUpRight } from "lucide-react";
import Logo from "./Logo";

const NAV_LINKS = [
  { href: "/", label: "Visualize", icon: Network },
  { href: "/edit", label: "Edit", icon: Edit3 },
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/predict", label: "Predict", icon: Brain },
];

export default function Header() {
  const pathname = usePathname();
  return (
    <header className="app-navigation">
      <div className="navigation-brand"><Logo /></div>
      <nav className="navigation-links" aria-label="Main navigation">
        {NAV_LINKS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="navigation-link" aria-current={pathname === href ? "page" : undefined}>
            <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <a className="navigation-credit" href="https://dice-research.org/" target="_blank" rel="noopener noreferrer">
        <span>DICE Research Group<small>Paderborn University</small></span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    </header>
  );
}
