"use client";

import { useMemo, useState } from "react";

import { Card } from "@/components/CoachShell";
import { useSaveQueue } from "@/hooks/useSaveQueue";
import { SCALE, scaleOf } from "@/lib/charge";
import { formatHour, toTimeValue } from "@/lib/slots";
import { createClient } from "@/lib/supabase/client";
import type { Entry } from "@/lib/weekly-map";

type Props = {
  sessionId: string;
  entries: Entry[];
  hours: number[];
  dayCount: number;
};

/**
 * Every hour of every day exactly as the client logged it — the raw data
 * behind the averages. Blank cells are skipped hours (no row exists).
 *
 * Jen can edit it (2026-09-29): clients call her, or sit with her, and say
 * "that morning was actually a 50". The 24-hour window that stops clients
 * back-filling isn't hers — entry_hour_open() lets coaches through — but the
 * change should be deliberate, hence the Edit toggle rather than a grid that's
 * always live under the cursor.
 */
export function DailyLog({ sessionId, entries, hours, dayCount }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { status, enqueue, retry } = useSaveQueue();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<Map<string, number>>(
    () => new Map(entries.map((e) => [`${e.dayNumber}:${e.hour}`, e.pct])),
  );

  const days = Array.from({ length: dayCount }, (_, i) => i + 1);
  const perDay = days.map((d) => hours.filter((h) => value.has(`${d}:${h}`)).length);

  const set = (day: number, hour: number, pct: number | null) => {
    setValue((all) => {
      const next = new Map(all);
      if (pct === null) next.delete(`${day}:${hour}`);
      else next.set(`${day}:${hour}`, pct);
      return next;
    });

    enqueue(`entry:${day}:${hour}`, async () => {
      // A cleared hour is a deleted row, never a zero — that's what keeps a
      // skipped hour out of the averages.
      const { error } =
        pct === null
          ? await supabase
              .from("daily_entries")
              .delete()
              .match({ session_id: sessionId, day_number: day, slot_hour: toTimeValue(hour) })
          : await supabase.from("daily_entries").upsert(
              { session_id: sessionId, day_number: day, slot_hour: toTimeValue(hour), energy_pct: pct },
              { onConflict: "session_id,day_number,slot_hour" },
            );
      if (error) throw error;
    });
  };

  return (
    <Card accent={100}>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-serif text-[22px] font-semibold text-navy">Daily log</h2>
        <div className="flex items-center gap-3">
          <span className="text-[11.5px] font-extrabold text-muted" aria-live="polite">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
          </span>
          <button
            type="button"
            onClick={() => setEditing((on) => !on)}
            className={`inline-flex min-h-10 items-center rounded-xl px-4 text-[12.5px] font-extrabold transition ${
              editing ? "bg-navy text-white" : "border-[1.5px] border-line bg-white text-navy hover:border-navy"
            }`}
          >
            {editing ? "Done editing" : "Edit entries"}
          </button>
        </div>
      </div>
      <p className="mb-4 text-[12px] leading-normal text-muted">
        {editing
          ? "Changes save as you make them. The blank option clears an hour, which keeps it out of the averages."
          : "Every hour exactly as the client logged it. Blank means the hour was skipped."}
      </p>

      {status === "error" ? (
        <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-level-10/30 bg-level-10/10 px-4 py-3 text-[13px] font-bold text-level-10">
          <span>A change hasn&rsquo;t saved.</span>
          <button type="button" onClick={retry} className="inline-flex min-h-9 items-center px-2 font-extrabold underline">
            Retry
          </button>
        </div>
      ) : null}

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
                  if (editing) {
                    return (
                      <td key={d} className="p-0">
                        <label className="sr-only" htmlFor={`cell-${d}-${h}`}>
                          Day {d}, {formatHour(h)}
                        </label>
                        <select
                          id={`cell-${d}-${h}`}
                          value={v ?? ""}
                          onChange={(e) => set(d, h, e.target.value === "" ? null : Number(e.target.value))}
                          className="h-7 w-full cursor-pointer rounded-[6px] border-0 text-center text-[11px] font-extrabold outline-none focus:ring-2 focus:ring-navy"
                          style={s ? { background: s.color, color: "#fff" } : { background: "#f4f3ef", color: "#8a8aa0" }}
                        >
                          <option value="">—</option>
                          {SCALE.map((level) => (
                            <option key={level.value} value={level.value}>
                              {level.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    );
                  }
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
