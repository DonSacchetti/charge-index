"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useSaveQueue } from "@/hooks/useSaveQueue";
import { createClient } from "@/lib/supabase/client";
import { formatHourLong, toTimeValue } from "@/lib/slots";

export type ScheduleItem = {
  hour: number;
  task: string;
  short: string;
  zone: string;
  color: string;
  tint: string;
  note: string | null;
};

type Props = {
  sessionId: string;
  items: ScheduleItem[];
  /**
   * False for coaches, and for anyone reading a plan they didn't buy. The
   * database says the same thing (plan_notes policies use has_peak_plan).
   */
  canEdit: boolean;
};

const DEBOUNCE_MS = 700;
const MAX_NOTE = 280;

/**
 * The Peak Plan's schedule, with the client's own intention on each hour
 * (Josh, 2026-09-24). The plan says what an hour is good for; this is where
 * the client says what they'll actually do in it, and what then goes into
 * their calendar.
 *
 * Notes save straight from the browser under RLS, like the check-in grid:
 * debounced while typing, flushed when the row closes or the tab is hidden.
 * Rendering is identical for a reader — no inputs, and the same markup
 * prints.
 */
export function ScheduleEditor({ sessionId, items, canEdit }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { status, enqueue, retry } = useSaveQueue();
  const [notes, setNotes] = useState<Record<number, string>>(() =>
    Object.fromEntries(items.map((i) => [i.hour, i.note ?? ""])),
  );
  const [openHour, setOpenHour] = useState<number | null>(null);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const latest = useRef(notes);
  useEffect(() => {
    latest.current = notes;
  }, [notes]);

  const flush = (hour: number) => {
    const timer = timers.current.get(hour);
    if (timer === undefined) return;
    clearTimeout(timer);
    timers.current.delete(hour);

    const body = (latest.current[hour] ?? "").trim();
    enqueue(`plan-note:${hour}`, async () => {
      // An emptied note is a deleted row, not an empty string — the calendar
      // file and the printed plan both read "no note" from the row's absence.
      const { error } = body
        ? await supabase
            .from("plan_notes")
            .upsert(
              { session_id: sessionId, slot_hour: toTimeValue(hour), body, updated_at: new Date().toISOString() },
              { onConflict: "session_id,slot_hour" },
            )
        : await supabase.from("plan_notes").delete().match({ session_id: sessionId, slot_hour: toTimeValue(hour) });
      if (error) throw error;
    });
  };

  const edit = (hour: number, text: string) => {
    setNotes((all) => ({ ...all, [hour]: text.slice(0, MAX_NOTE) }));
    const existing = timers.current.get(hour);
    if (existing !== undefined) clearTimeout(existing);
    timers.current.set(hour, setTimeout(() => flush(hour), DEBOUNCE_MS));
  };

  // Don't lose a half-typed note when the tab is hidden or closed.
  useEffect(() => {
    const flushAll = () => {
      for (const hour of [...timers.current.keys()]) flush(hour);
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flushAll();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flushAll);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flushAll);
    };
  });

  return (
    <>
      {canEdit ? (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
          <p className="m-0 text-[12.5px] text-muted">
            Tap an hour to say what you&rsquo;ll do in it. Those words become your calendar entries.
          </p>
          <span className="text-[11.5px] font-extrabold text-muted" aria-live="polite">
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : ""}
          </span>
        </div>
      ) : null}

      {status === "error" ? (
        <div role="alert" className="mb-3 flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-level-10/30 bg-level-10/10 px-4 py-3 text-[13px] font-bold text-level-10 print:hidden">
          <span>A note hasn&rsquo;t saved. Check your connection.</span>
          <button type="button" onClick={retry} className="inline-flex min-h-9 items-center px-2 font-extrabold underline">
            Retry
          </button>
        </div>
      ) : null}

      {/* One line per hour, stacked (Josh, 2026-09-29): hour, what it suits,
          the client's own words and the level all sit on the same row, so the
          whole day reads at a glance instead of scrolling. The note editor is
          the only thing that grows the row, and only while it's open. */}
      <ol className="m-0 mb-7 flex list-none flex-col gap-[3px] p-0">
        {items.map((s) => {
          const note = notes[s.hour] ?? "";
          const open = openHour === s.hour;
          return (
            <li
              key={s.hour}
              className="rounded-r-md border-l-4 px-2.5 py-[3px] print:break-inside-avoid"
              style={{ borderColor: s.color, background: s.tint }}
            >
              <div className="flex items-baseline gap-2.5">
                <span className="w-[64px] flex-none text-[11.5px] font-extrabold text-navy">{formatHourLong(s.hour)}</span>
                {/* Wraps rather than truncating, and always keeps the plan's
                    own wording beside the client's note as a hint about the
                    kind of work the hour suits (Josh, 2026-09-29). */}
                <span className="min-w-0 flex-1 text-[11.5px] wrap-anywhere text-body">
                  {note ? (
                    <span className="font-bold" style={{ color: s.color }}>
                      {note}
                    </span>
                  ) : null}
                  <span className={note ? "ml-2 text-[10.5px] text-muted" : "font-bold text-ink"}>
                    <span className="sm:hidden">{s.short}</span>
                    <span className="hidden sm:inline">{s.task}</span>
                  </span>
                </span>
                {canEdit && !open ? (
                  <button
                    type="button"
                    onClick={() => setOpenHour(s.hour)}
                    aria-label={`${note ? "Edit" : "Add"} what you'll do at ${formatHourLong(s.hour)}`}
                    className="flex-none px-1 text-[10.5px] font-extrabold text-muted underline transition hover:text-navy print:hidden"
                  >
                    {note ? "edit" : "add"}
                  </button>
                ) : null}
                <span className="hidden flex-none text-[9px] font-extrabold tracking-[0.06em] uppercase sm:inline" style={{ color: s.color }}>
                  {s.zone}
                </span>
              </div>

              {canEdit && open ? (
                <div className="py-1.5 pl-[64px] print:hidden">
                  <label htmlFor={`plan-note-${s.hour}`} className="sr-only">
                    What you&rsquo;ll do at {formatHourLong(s.hour)}
                  </label>
                  <textarea
                    id={`plan-note-${s.hour}`}
                    value={note}
                    autoFocus
                    rows={2}
                    maxLength={MAX_NOTE}
                    placeholder="e.g. Write the board deck — no email, phone away"
                    onChange={(e) => edit(s.hour, e.target.value)}
                    onBlur={() => {
                      flush(s.hour);
                      setOpenHour(null);
                    }}
                    className="w-full resize-y rounded-xl border-[1.5px] border-line bg-white px-3 py-2 text-[13.5px] leading-[1.5] text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/20"
                  />
                  <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
                    <span>{MAX_NOTE - note.length} left</span>
                    <button
                      type="button"
                      onClick={() => {
                        flush(s.hour);
                        setOpenHour(null);
                      }}
                      className="inline-flex min-h-9 items-center px-2 font-extrabold text-navy underline"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}
