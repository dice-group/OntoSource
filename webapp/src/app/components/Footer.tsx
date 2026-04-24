"use client";
import { ExternalLink, Github } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-slate-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>© {currentYear}</span>
            <a
              href="https://dice-research.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#3B78B8] hover:text-[#2A5988] transition-colors"
            >
              DICE Research Group
            </a>
            <span className="text-slate-300">·</span>
            <span>Paderborn University</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://dice-research.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-[#3B78B8] transition-colors"
              aria-label="DICE Research Group website"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href="https://github.com/dice-group/ontosource"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="OntoSource on GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
