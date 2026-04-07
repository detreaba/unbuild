import { GitFork } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border py-10 mt-20">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded bg-accent flex items-center justify-center text-white font-bold text-xs">
                U
              </div>
              <span className="font-semibold">
                Un<span className="text-accent">Build</span>
              </span>
            </div>
            <p className="text-sm text-muted leading-relaxed">
              Deep reverse engineering for repos and websites.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-medium text-sm mb-3">Links</h4>
            <ul className="space-y-2 text-sm text-muted">
              <li>
                <a href="#features" className="hover:text-foreground transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-foreground transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#cli" className="hover:text-foreground transition-colors">
                  CLI
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/detreaba/unbuild"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  GitHub
                </a>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h4 className="font-medium text-sm mb-3">Open Source</h4>
            <p className="text-sm text-muted leading-relaxed mb-2">
              MIT Licensed. Contributions welcome.
            </p>
            <a
              href="https://github.com/detreaba/unbuild"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
            >
              <GitFork size={14} /> Star on GitHub
            </a>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border text-xs text-muted text-center">
          UnBuild — Deconstruct anything. Rebuild better.
        </div>
      </div>
    </footer>
  );
}
