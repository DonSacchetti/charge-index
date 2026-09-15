import type { ReactNode } from "react";

import { signOut } from "@/app/auth/actions";
import { Logo } from "@/components/brand/Logo";
import { CoachNav } from "@/components/coach/CoachNav";

/** Frame for Jen's side of the app: aurora header with the coach navigation. */
export function CoachShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-cream">
      <header className="aurora sticky top-0 z-40 text-white print:hidden">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Logo href="/coach" tone="light" sub="Coach view" />
          <CoachNav />
          <form action={signOut} className="ml-auto">
            <button type="submit" className="inline-flex min-h-10 items-center rounded-full px-3.5 text-[13px] font-bold text-white/70 hover:bg-white/10 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
        <div className="spectrum-animated h-[3px]" />
      </header>
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export function Card({ children, className = "", accent }: { children: ReactNode; className?: string; accent?: number | "spectrum" | "gold" }) {
  return (
    <section
      className={`animate-rise relative overflow-hidden rounded-[24px] bg-paper p-6 shadow-[0_22px_55px_-32px_rgba(19,36,73,0.5),0_2px_10px_rgba(19,36,73,0.05)] ${className}`}
    >
      {accent ? (
        <div
          className={`absolute inset-x-0 top-0 h-[5px] ${accent === "spectrum" ? "spectrum" : ""}`}
          style={accent === "gold" ? { background: "var(--color-gold)" } : typeof accent === "number" ? { background: `var(--color-level-${accent})` } : undefined}
        />
      ) : null}
      {children}
    </section>
  );
}
