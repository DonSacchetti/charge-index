import { Card } from "@/components/CoachShell";
import type { Consistency } from "@/lib/coach-analysis";

/**
 * Completion streaks, Build Plan Phase 7. Takes the burnout gauge's place in
 * the prototype's two-column row, since burnout is out of scope.
 */
export function ConsistencyCard({ data, hoursPerDay }: { data: Consistency; hoursPerDay: number }) {
  const stats = [
    { label: "Days complete", value: `${data.completeDays} of ${data.days.length}` },
    { label: "Longest streak", value: `${data.longestStreak} ${data.longestStreak === 1 ? "day" : "days"}` },
    { label: "Hours covered", value: `${data.coveragePct}%` },
  ];

  return (
    <Card>
      <h2 className="mb-1 text-[10px] font-extrabold tracking-[0.13em] text-muted uppercase">Consistency</h2>
      <p className="mb-4 text-[11.5px] leading-normal text-muted">
        A day is complete when all {hoursPerDay} waking hours are logged.
      </p>

      <dl className="m-0 mb-5 grid grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[12px] bg-[#faf9f7] px-3 py-3 text-center">
            <dd className="m-0 font-serif text-[22px] font-semibold text-navy">{s.value}</dd>
            <dt className="mt-1 text-[10.5px] font-bold text-muted">{s.label}</dt>
          </div>
        ))}
      </dl>

      <ol className="m-0 flex list-none flex-col gap-[7px] p-0">
        {data.days.map((d) => {
          const pct = hoursPerDay ? Math.round((d.logged / hoursPerDay) * 100) : 0;
          return (
            <li key={d.dayNumber} className="flex items-center gap-3">
              <span className="w-12 flex-none text-[11.5px] font-extrabold text-navy">Day {d.dayNumber}</span>
              <span
                className="h-[10px] flex-1 overflow-hidden rounded-full bg-[#f0efea]"
                role="img"
                aria-label={`Day ${d.dayNumber}: ${d.logged} of ${hoursPerDay} hours logged`}
              >
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${pct}%`, background: d.complete ? "#2f7d52" : "#3a6ec4" }}
                />
              </span>
              <span className="w-14 flex-none text-right text-[11px] font-bold text-muted">
                {d.complete ? "✓ full" : `${d.logged}/${hoursPerDay}`}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
