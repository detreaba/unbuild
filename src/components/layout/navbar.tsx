"use client";

import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { GitFork, Menu, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "CLI", href: "#cli" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  function scrollTo(href: string) {
    setMobileOpen(false);
    const el = document.querySelector(href);
    el?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-accent flex items-center justify-center text-white font-bold text-sm">
            U
          </div>
          <span className="font-semibold text-lg tracking-tight">
            Un<span className="text-accent">Build</span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => scrollTo(link.href)}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              {link.label}
            </button>
          ))}
          <a
            href="https://github.com/detreaba/unbuild"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-foreground transition-colors"
          >
            <GitFork size={18} />
          </a>
          <button
            onClick={() => scrollTo("#hero")}
            className="px-4 py-1.5 text-sm font-medium bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Try It Free
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-muted hover:text-foreground"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden border-t border-border bg-background"
          >
            <div className="px-4 py-3 flex flex-col gap-3">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollTo(link.href)}
                  className="text-sm text-muted hover:text-foreground text-left"
                >
                  {link.label}
                </button>
              ))}
              <a
                href="https://github.com/detreaba/unbuild"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted hover:text-foreground"
              >
                <GitFork size={16} /> GitHub
              </a>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
