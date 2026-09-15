import Link from "next/link";
import type { ReactNode } from "react";

import { signOut } from "@/app/auth/actions";

/** Desktop-first frame for Jen's side of the app. */
export function CoachShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1000px] items-center gap-3 px-6 py-4">
          <Link href="/coach" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-navy" />
            <div>
              <div className="text-[11px] font-extrabold tracking-[0.16em] text-navy uppercase">
                Soenen Strategies
              </div>
              <div className="text-[11px] text-muted">Coach view</div>
            </div>
          </Link>
          <form action={signOut} className="ml-auto">
            <button
              type="submit"
              className="-mx-2 inline-flex min-h-11 items-center px-2 text-[12px] font-bold text-muted underline"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1000px] flex-1 px-6 py-8">{children}</main>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-[18px] bg-white p-6 shadow-[0_3px_22px_rgba(19,36,73,0.07)] ${className}`}
    >
      {children}
    </section>
  );
}
