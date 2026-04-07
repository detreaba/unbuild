"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Key,
  History,
  Cpu,
  Shield,
  BarChart3,
  ArrowLeft,
  Loader2,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/keys", label: "API Keys", icon: Key },
  { href: "/admin/history", label: "History", icon: History },
  { href: "/admin/models", label: "Models", icon: Cpu },
  { href: "/admin/limits", label: "Rate Limits", icon: Shield },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [authState, setAuthState] = useState<"loading" | "ok" | "denied">("loading");

  // Don't check auth on login page
  const isLoginPage = pathname === "/admin/login";

  useEffect(() => {
    if (isLoginPage) {
      setAuthState("ok");
      return;
    }

    // Verify session before showing anything
    fetch("/api/admin/analytics", { method: "GET" })
      .then((r) => {
        if (r.status === 401) {
          setAuthState("denied");
          router.replace("/admin/login");
        } else {
          setAuthState("ok");
        }
      })
      .catch(() => {
        setAuthState("denied");
        router.replace("/admin/login");
      });
  }, [pathname, isLoginPage, router]);

  // Login page — no sidebar, no auth gate
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading — show nothing (prevents flash)
  if (authState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 size={24} className="text-muted animate-spin" />
      </div>
    );
  }

  // Denied — show nothing while redirecting
  if (authState === "denied") {
    return null;
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-surface flex flex-col">
        <div className="p-4 border-b border-border">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted hover:text-foreground">
            <ArrowLeft size={14} />
            Back to site
          </Link>
          <h2 className="font-semibold mt-3">
            Un<span className="text-accent">Build</span>
          </h2>
          <p className="text-xs text-muted">Administration</p>
        </div>

        <nav className="flex-1 p-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                  active
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <item.icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
