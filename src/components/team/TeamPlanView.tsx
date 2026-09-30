import type { TeamPlan } from "@/lib/team-plan";
import { formatRanges } from "@/lib/weekly-map";

const BLOCKS = [
  {
    key: "protect" as const,
    label: "Protect",
    desc: "Most of the team is at their sharpest. Leave these hours for the work only each person can do.",
    color: "#2f7d52",
    tint: "#eaf5ef",
  },
  {
    key: "meet" as const,
    label: "Meet",
    desc: "Enough of the team is ready to be in a room together.",
    color: "#3a6ec4",
    tint: "#eaf0fb",
  },
  {
    key: "avoid" as const,
    label: "Schedule nothing",
    desc: "Most of the team is running low. Anything that matters will cost more here than it's worth.",
    color: "#c04545",
    tint: "#fceaea",
  },
];

/**
 * The team's plan, as the lead reads it and as Jen previews it before
 * releasing. Aggregates only — no member appears with their own hours, which
 * is the whole point of the corporate side (Jen and Josh, 2026-09-29).
 */
export function TeamPlanView({ plan, preview }: { plan: TeamPlan; preview?: boolean }) {
  const chart = plan.hours.filter((h) => h.answered > 0);

  return (
    <div>
      {preview ? (
        <p className="mb-4 rounded-2xl border border-line bg-[#f4f3ef] px-4 py-3 text-[12.5px] text-body">
          This is what the team lead will see. Nothing is visible to them until you release it.
        </p>
      ) : null}

      <ul className="m-0 mb-6 flex list-none flex-col gap-2 p-0">
        {plan.headlines.map((line) => (
          <li key={line} className="flex gap-2.5 text-[14px] leading-[1.6] text-body">
            <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-navy" aria-hidden />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {BLOCKS.map((b) => (
          <div
            key={b.key}
            className="relative overflow-hidden rounded-[16px] border-[1.5px] py-3 pr-4 pl-5"
            style={{ borderColor: b.color, background: b.tint }}
          >
            <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: b.color }} />
            <div className="text-[9.5px] font-extrabold tracking-[0.13em] uppercase" style={{ color: b.color }}>
              {b.label}
            </div>
            <div className="font-serif text-[17px] leading-[1.2] font-semibold text-ink">{formatRanges(plan[b.key])}</div>
            <p className="mt-0.5 text-[11px] leading-[1.4] text-muted">{b.desc}</p>
          </div>
        ))}
      </div>

      {chart.length ? (
        <div>
          <div className="mb-2 text-[10.5px] font-extrabold tracking-[0.07em] text-navy uppercase">
            How much of the team is sharp, hour by hour
          </div>
          <div className="flex items-end gap-[3px]" role="img" aria-label="Share of the team at peak, by hour">
            {chart.map((h) => {
              const pct = Math.round(h.peakShare * 100);
              const ready = Math.round(h.readyShare * 100);
              return (
                <div key={h.hour} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <div className="flex h-24 w-full items-end justify-center rounded-md bg-cream" title={`${pct}% at peak, ${ready}% ready`}>
                    <span
                      className="w-full rounded-md"
                      style={{
                        height: `${Math.max(3, ready)}%`,
                        background: "var(--color-glow-75)",
                      }}
                    >
                      <span
                        className="block w-full rounded-md"
                        style={{ height: `${ready ? Math.round((pct / ready) * 100) : 0}%`, background: "var(--color-level-100)" }}
                      />
                    </span>
                  </div>
                  <span className="text-[8.5px] font-bold text-muted">{h.hour % 12 === 0 ? 12 : h.hour % 12}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Dark green is the share of the team at peak; lighter is the share ready to collaborate.
          </p>
        </div>
      ) : null}

      {plan.excluded.length ? (
        <p className="mt-5 text-[12px] text-muted">
          Left out for logging too little: {plan.excluded.map((m) => m.name || "someone").join(", ")}.
        </p>
      ) : null}
    </div>
  );
}
