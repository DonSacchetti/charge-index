import type { ReactNode } from "react";

import { ChargeMeter } from "@/components/brand/ChargeMeter";
import { Logo } from "@/components/brand/Logo";
import { SCALE } from "@/lib/charge";

/** Sign in / sign up: brand panel beside the form on desktop, stacked on phones. */
export function AuthShell({ eyebrow, title, lead, children }: { eyebrow: string; title: ReactNode; lead: ReactNode; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh flex-1 bg-cream lg:grid-cols-[1.05fr_1fr]">
      <aside className="aurora flex flex-col px-6 pt-6 pb-10 text-white sm:px-10 lg:min-h-dvh lg:py-10">
        <Logo tone="light" />
        <div className="mt-10 lg:mt-auto">
          <p className="animate-rise text-[11px] font-extrabold tracking-[0.2em] text-gold-bright uppercase">{eyebrow}</p>
          <h1 className="animate-rise mt-4 font-serif text-[38px] leading-[1.04] font-semibold [animation-delay:60ms] sm:text-[54px]">{title}</h1>
          <p className="animate-rise mt-4 max-w-md text-[15px] leading-[1.7] text-white/75 [animation-delay:120ms]">{lead}</p>
        </div>
        <div className="mt-10 hidden lg:block">
          <ChargeMeter values={[40, 58, 76, 94, 100, 88, 70, 52, 34, 22, 36, 60, 74, 58, 38]} height={150} gap={7} />
          <div className="mt-8 grid grid-cols-5 gap-2">
            {SCALE.map((s) => (
              <div key={s.value} className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-3">
                <div className="h-1.5 rounded-full" style={{ background: `var(--color-glow-${s.value})` }} />
                <div className="mt-2 font-serif text-[18px] font-semibold">{s.label}</div>
                <div className="text-[10px] leading-tight font-bold text-white/60">{s.short}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
      <main className="flex items-start justify-center px-5 py-10 sm:px-10 lg:items-center">
        <div className="animate-rise w-full max-w-md rounded-[28px] bg-paper p-6 shadow-[0_30px_70px_-35px_rgba(19,36,73,0.55)] [animation-delay:120ms] sm:p-9">
          <div className="spectrum mb-7 h-[4px] w-14 rounded-full" />
          {children}
        </div>
      </main>
    </div>
  );
}
