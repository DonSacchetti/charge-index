import type { TeamProgressRow } from "@/lib/teams";

/**
 * Who has joined and how far along they are — the only thing a team lead ever
 * sees about their people (Jen and Josh, 2026-09-29). Every number here comes
 * from team_progress(), which runs in the database and returns aggregates, so
 * a lead can read this page without being able to read a single entry.
 */
export function TeamRoster({ rows, seats, forLead }: { rows: TeamProgressRow[]; seats: number; forLead: boolean }) {
  const done = rows.filter((r) => r.session_status === "completed").length;
  const flagged = rows.filter((r) => r.flagged);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="m-0 text-[13px] text-body">
          <strong className="text-navy">
            {rows.length} of {seats || rows.length} joined
          </strong>
          {rows.length ? ` · ${done} finished` : null}
        </p>
        {flagged.length ? (
          <p className="m-0 text-[12.5px] font-bold text-level-10">
            {flagged.length === 1 ? "1 person has" : `${flagged.length} people have`} hours slipping
          </p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="m-0 text-[13.5px] text-body">Nobody has joined yet.</p>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {rows.map((r) => {
            const possible = r.day_count * r.hours_per_day;
            const pct = possible ? Math.min(100, Math.round((r.hours_logged / possible) * 100)) : 0;
            return (
              <li key={r.client_id} className="rounded-2xl border border-line bg-white p-3.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="min-w-0 text-[14px] font-extrabold text-navy wrap-anywhere">
                    {r.full_name || "Unnamed"}
                    {r.role === "lead" ? <span className="ml-2 text-[10.5px] font-bold text-muted uppercase">lead</span> : null}
                  </span>
                  <span className="text-[12px] font-bold text-body">
                    {r.session_id ? (
                      r.session_status === "completed" ? (
                        <span className="text-level-100">✓ finished</span>
                      ) : (
                        `${r.days_complete} of ${r.day_count} days · ${r.hours_logged} hours`
                      )
                    ) : (
                      <span className="text-muted">not started</span>
                    )}
                  </span>
                </div>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background:
                        r.session_status === "completed"
                          ? "var(--color-level-100)"
                          : "linear-gradient(90deg, var(--color-glow-75), var(--color-glow-100))",
                    }}
                  />
                </div>

                {r.flagged ? (
                  <p className="m-0 mt-2 text-[11.5px] font-bold text-level-10">
                    ⚑ {r.missed_hours} {r.missed_hours === 1 ? "hour has" : "hours have"} closed unlogged, including two in a
                    row{forLead ? " — worth a nudge." : "."}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
