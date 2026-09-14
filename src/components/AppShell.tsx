import type { ReactNode } from "react";

type Props = {
  /** Small uppercase line under the wordmark — "Getting set up", "Spring 2026". */
  subtitle: string;
  /** Pill on the right of the header — "5–7 days", "Day 2 of 5". */
  badge?: string;
  /**
   * Progress rail under the header, as in the prototype: segments before
   * `current` read as done, `current` is gold, the rest are faint. The
   * prototype uses day_count + 2 segments — setup, one per day, results.
   */
  progress?: { total: number; current: number };
  children: ReactNode;
};

export function AppShell({ subtitle, badge, progress, children }: Props) {
  const segments = progress?.total ?? 7;
  const current = progress?.current ?? 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-1 flex-col bg-white shadow-[0_0_60px_rgba(19,36,73,0.08)] sm:my-8 sm:min-h-0 sm:rounded-3xl sm:overflow-hidden">
      <header className="bg-navy px-5 pt-5 pb-4 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-serif text-[19px] leading-none font-semibold">
              Charge Index<sup className="text-[10px]">™</sup>
            </div>
            <div className="mt-[3px] text-[10px] font-bold tracking-[0.13em] text-white/50 uppercase">
              {subtitle}
            </div>
          </div>
          {badge ? (
            <span className="rounded-full border border-white/20 bg-white/12 px-[11px] py-[5px] text-[10.5px] font-extrabold whitespace-nowrap">
              {badge}
            </span>
          ) : null}
        </div>
        <div className="mt-[13px] flex gap-[3px]">
          {Array.from({ length: segments }, (_, i) => (
            <div
              key={i}
              className={`h-[3px] flex-1 rounded-sm ${
                i < current ? "bg-white/50" : i === current ? "bg-gold" : "bg-white/13"
              }`}
            />
          ))}
        </div>
      </header>

      <div className="flex flex-1 flex-col bg-[#faf9f7]">{children}</div>
    </div>
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
    <label
      htmlFor={htmlFor}
      className="mb-[5px] block text-[10.5px] font-extrabold tracking-[0.07em] text-navy uppercase">
      {children}
    </label>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-[11px] text-[10px] font-extrabold tracking-[0.14em] text-muted uppercase">
      {children}
    </div>
  );
}

export const inputClass =
  "w-full rounded-[11px] border-[1.5px] border-line bg-white px-[14px] py-3 text-[15px] text-ink outline-none focus:border-navy focus:ring-[3px] focus:ring-navy/10";

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-[11px] border-[1.5px] border-level-10/30 bg-level-10/8 px-[14px] py-3 text-[13px] font-semibold text-level-10"
    >
      {message}
    </p>
  );
}

export function SubmitButton({
  children,
  pending,
}: {
  children: ReactNode;
  pending?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-[13px] bg-navy px-4 py-4 text-[15px] font-extrabold text-white shadow-[0_6px_20px_rgba(19,36,73,0.28)] transition-colors hover:bg-navy-light disabled:opacity-60"
    >
      {pending ? "One moment…" : children}
    </button>
  );
}
