import { Card } from "@/components/CoachShell";
import { SCALE, scaleOf } from "@/lib/charge";
import { formatHour } from "@/lib/slots";
import type { Entry } from "@/lib/weekly-map";

/**
 * Every hour of every day exactly as the client logged it — the raw data
 * behind the averages. Blank cells are skipped hours (no row exists).
 */
export function DailyLog({ entries, hours, dayCount }: { entries: Entry[]; hours: number[]; dayCount: number }) {
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);
  const value = new Map(entries.map((e) => [`${e.dayNumber}:${e.hour}`, e.pct]));
  const perDay = days.map((d) => hours.filter((h) => value.has(`${d}:${h}`)).length);

  return (
    <Card>
      <h2 className="mb-1 font-serif text-[18px] font-semibold text-navy">Daily log</h2>
      <p className="mb-4 text-[12px] leading-normal text-muted">
        Every hour exactly as the client logged it. Blank means the hour was skipped.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-separate border-spacing-[3px] text-center text-[11px]">
          <thead>
            <tr>
              <th className="w-[62px]" />
              {days.map((d) => (
                <th key={d} scope="col" className="pb-1 text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase">
                  Day {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h}>
                <th scope="row" className="pr-2 text-left text-[11.5px] font-extrabold whitespace-nowrap text-navy">
                  {formatHour(h)}
                </th>
                {days.map((d) => {
                  const v = value.get(`${d}:${h}`);
                  const s = v === undefined ? null : scaleOf(v);
                  return (
                    <td
                      key={d}
                      className="h-7 rounded-[6px] font-extrabold"
                      style={s ? { background: s.color, color: "#fff" } : { background: "#f4f3ef", color: "#c8c7d2" }}
                      title={s ? `Day ${d}, ${formatHour(h)}: ${s.label} ${s.short}` : `Day ${d}, ${formatHour(h)}: skipped`}
                    >
                      {s ? s.label : ""}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <th scope="row" className="pt-1 pr-2 text-left text-[10px] font-extrabold tracking-[0.06em] text-muted uppercase">
                Logged
              </th>
              {perDay.map((n, i) => (
                <td key={i} className="pt-1 text-[11px] font-bold text-muted">
                  {n}/{hours.length}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-body">
        {SCALE.map((s) => (
          <span key={s.value} className="flex items-center gap-[6px]">
            <span className="inline-block h-[10px] w-[10px] rounded-[3px]" style={{ background: s.color }} />
            {s.label} {s.short}
          </span>
        ))}
      </div>
    </Card>
  );
}
