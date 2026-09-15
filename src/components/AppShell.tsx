import type { CSSProperties, ReactNode } from "react";

/**
 * Client page frame. The navy hero band continues out of the nav bar and holds
 * the page's title; content cards float up over its lower edge.
 */
export function PageHero({
  eyebrow,
  title,
  lead,
  badge,
  progress,
  aside,
  children,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  badge?: ReactNode;
  /** Segmented rail: segments before `current` done, `current` glowing. */
  progress?: { total: number; current: number };
  aside?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="aurora -mt-px text-white print:hidden">
      <div className="mx-auto max-w-6xl px-5 pt-8 pb-20 sm:px-8 sm:pt-10 sm:pb-24">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 wrap-anywhere">
            {eyebrow ? (
              <p className="animate-rise text-[11px] font-extrabold tracking-[0.2em] text-gold-bright uppercase">{eyebrow}</p>
            ) : null}
            <h1 className="animate-rise mt-3 font-serif text-[34px] leading-[1.05] font-semibold tracking-[-0.01em] [animation-delay:60ms] sm:text-[48px]">
              {title}
            </h1>
            {lead ? <div className="animate-rise mt-3 max-w-2xl text-[15px] leading-[1.65] text-white/75 [animation-delay:120ms]">{lead}</div> : null}
          </div>
          {badge || aside ? (
            <div className="animate-rise flex flex-col items-end gap-3 [animation-delay:160ms]">
              {badge ? (
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[12px] font-extrabold whitespace-nowrap backdrop-blur">
                  {badge}
                </span>
              ) : null}
              {aside}
            </div>
          ) : null}
        </div>
        {progress ? <ProgressRail {...progress} /> : null}
        {children}
      </div>
    </section>
  );
}

export function ProgressRail({ total, current }: { total: number; current: number }) {
  return (
    <div className="mt-7 flex gap-[5px]" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="h-[5px] flex-1 overflow-hidden rounded-full bg-white/12">
          {i <= current ? (
            <div
              className={`h-full origin-left rounded-full ${i === current ? "spectrum-animated" : "bg-white/60"}`}
              style={{ animation: `rise 0.5s ease ${i * 40}ms both` }}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** Content area that overlaps the hero's lower edge. */
export function PageBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`relative mx-auto -mt-14 w-full max-w-6xl px-4 pb-12 sm:px-8 ${className}`}>{children}</div>;
}

/** The standard card: paper, soft shadow, optional coloured top accent. */
export function Surface({
  children,
  className = "",
  accent,
  style,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  /** A level (100/75/50/25/10), "spectrum", or "gold". */
  accent?: number | "spectrum" | "gold";
  style?: CSSProperties;
  delay?: number;
}) {
  return (
    <section
      className={`animate-rise relative overflow-hidden rounded-[26px] bg-paper shadow-[0_24px_60px_-30px_rgba(19,36,73,0.45),0_2px_10px_rgba(19,36,73,0.05)] ${className}`}
      style={{ animationDelay: `${delay}ms`, ...style }}
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

export function FieldLabel({
  htmlFor,
  children,
}: {
  /** Id of the field this labels — required so screen readers announce it. */
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="mb-[6px] block text-[11px] font-extrabold tracking-[0.08em] text-navy uppercase">
      {children}
    </label>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-3 text-[11px] font-extrabold tracking-[0.16em] text-muted uppercase">
      <span className="spectrum h-[3px] w-6 rounded-full" />
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/20";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="animate-pop rounded-2xl border-[1.5px] border-level-10/30 bg-level-10/8 px-4 py-3 text-[13px] font-bold text-level-10">
      {message}
    </p>
  );
}

export function SubmitButton({ children, pending }: { children: ReactNode; pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative w-full overflow-hidden rounded-2xl bg-navy px-4 py-4 text-[15px] font-extrabold text-white shadow-[0_14px_34px_-14px_rgba(19,36,73,0.9)] transition hover:-translate-y-0.5 disabled:opacity-60"
    >
      <span className="spectrum-animated absolute inset-x-0 bottom-0 h-[3px]" aria-hidden />
      {pending ? "One moment…" : children}
    </button>
  );
}
