"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { signOut } from "@/app/auth/actions";
import { Logo } from "@/components/brand/Logo";
import type { ClientNavData } from "@/components/nav/nav-types";

type Item = {
  key: string;
  label: string;
  href: string | null;
  locked?: boolean;
  active: (path: string) => boolean;
  icon: ReactNode;
  color: string;
};

const Icon = {
  home: (
    <path d="M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-8.5Z" />
  ),
  log: (
    <>
      <rect x="4" y="13" width="3" height="7" rx="1" />
      <rect x="10.5" y="8" width="3" height="12" rx="1" />
      <rect x="17" y="4" width="3" height="16" rx="1" />
    </>
  ),
  results: <path d="M4 18c3-8 6-9 8-6s5 2 8-6M4 21h16" />,
  plan: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </>
  ),
  coach: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20c.6-3.6 2.8-5.5 5.5-5.5s4.9 1.9 5.5 5.5" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8M18.5 20c-.3-2.4-1.3-4-2.8-4.9" />
    </>
  ),
  lock: <path d="M8 11V8a4 4 0 0 1 8 0v3M6.5 11h11v9h-11z" />,
};

function Glyph({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

function items(nav: ClientNavData): Item[] {
  const list: Item[] = [
    { key: "home", label: "Home", href: "/setup", active: (p) => p === "/setup", icon: Icon.home, color: "var(--color-glow-75)" },
    {
      key: "log",
      label: "Log",
      href: nav.logHref ?? "/setup",
      active: (p) => p.startsWith("/track/") && !p.endsWith("/complete"),
      icon: Icon.log,
      color: "var(--color-glow-100)",
    },
    {
      key: "results",
      label: "Results",
      href: nav.resultsHref,
      active: (p) => p.endsWith("/complete"),
      icon: Icon.results,
      color: "var(--color-glow-25)",
    },
    {
      key: "plan",
      label: "Peak Plan",
      href: nav.planHref ?? nav.resultsHref,
      locked: !nav.planHref,
      active: (p) => p.startsWith("/plan/"),
      icon: Icon.plan,
      color: "var(--color-gold-bright)",
    },
  ];
  if (nav.isStaff) {
    list.push({ key: "coach", label: "Coach", href: "/coach", active: (p) => p.startsWith("/coach"), icon: Icon.coach, color: "var(--color-glow-50)" });
  }
  return list;
}

/**
 * The client app's navigation. Desktop: a top bar. Phones: a slim top bar
 * plus a bottom tab bar within thumb reach. Items with nowhere to go yet
 * (no finished session) render disabled; the Peak Plan shows a lock until
 * it's purchased and leads to the results screen where it's unlocked.
 */
export function ClientNav({ nav }: { nav: ClientNavData }) {
  const pathname = usePathname();
  const list = items(nav);

  return (
    <>
      <header className="aurora sticky top-0 z-40 text-white print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-8">
          <Logo href="/setup" tone="light" sub={nav.name ? `Hi, ${nav.name.split(/\s+/)[0]}` : "Soenen Strategies"} />
          <nav aria-label="Main" className="ml-6 hidden items-center gap-1 md:flex">
            {list.map((it) => {
              const active = it.active(pathname);
              if (!it.href) {
                return (
                  <span key={it.key} aria-disabled className="inline-flex min-h-10 cursor-not-allowed items-center gap-2 rounded-full px-3 text-[13px] font-bold text-white/30">
                    <Glyph className="h-4 w-4">{it.icon}</Glyph>
                    {it.label}
                  </span>
                );
              }
              return (
                <Link
                  key={it.key}
                  href={it.href}
                  aria-current={active ? "page" : undefined}
                  className={`group relative inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-extrabold transition ${
                    active ? "bg-white text-navy shadow-[0_6px_20px_-8px_rgba(255,255,255,0.6)]" : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Glyph className="h-4 w-4">{it.locked ? Icon.lock : it.icon}</Glyph>
                  {it.label}
                  {!active ? <span className="absolute inset-x-4 -bottom-[3px] h-[2px] rounded-full opacity-0 transition group-hover:opacity-100" style={{ background: it.color }} /> : null}
                </Link>
              );
            })}
          </nav>
          <form action={signOut} className="ml-auto">
            <button type="submit" className="inline-flex min-h-10 items-center rounded-full px-3.5 text-[13px] font-bold text-white/70 hover:bg-white/10 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
        <div className="spectrum-animated h-[3px]" />
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-deep/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg md:hidden print:hidden"
      >
        <div className="spectrum h-[2px] opacity-80" />
        <ul className="m-0 flex list-none justify-around p-0 px-1">
          {list.map((it) => {
            const active = it.active(pathname);
            const inner = (
              <>
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition ${active ? "animate-pop" : ""}`}
                  style={active ? { background: it.color, color: "var(--color-navy-deep)" } : undefined}
                >
                  <Glyph className="h-[21px] w-[21px]">{it.locked ? Icon.lock : it.icon}</Glyph>
                </span>
                <span className="mt-[3px] text-[10.5px] font-extrabold">{it.label}</span>
              </>
            );
            return (
              <li key={it.key} className="flex-1">
                {it.href ? (
                  <Link
                    href={it.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[60px] flex-col items-center justify-center ${active ? "text-white" : "text-white/60"}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <span aria-disabled className="flex min-h-[60px] flex-col items-center justify-center text-white/25">
                    {inner}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
