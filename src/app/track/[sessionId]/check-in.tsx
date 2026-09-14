"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { AppShell, FieldLabel } from "@/components/AppShell";
import { useSaveQueue } from "@/hooks/useSaveQueue";
import { SCALE, scaleOf } from "@/lib/charge";
import {
  type DayLog,
  emptyDay,
  isComplete,
  loggedCount,
} from "@/lib/progress";
import { formatHour } from "@/lib/slots";
import { createClient } from "@/lib/supabase/client";

import { completeSession } from "./actions";

type Props = {
  sessionId: string;
  label: string;
  dayCount: number;
  /** Hour numbers in display order, e.g. [7, 8, … 23, 0]. */
  hours: number[];
  initialDays: DayLog[];
  initialDay: number;
};

type NoteField = "feel" | "unexpected" | "forJen";

const NOTE_DEBOUNCE_MS = 700;

const REFLECTIONS: { field: NoteField; label: string; placeholder: string }[] = [
  { field: "feel", label: "How did you feel?", placeholder: "Energy, mood, mindset today…" },
  { field: "unexpected", label: "Anything unexpected?", placeholder: "Surprises, disruptions, wins…" },
  { field: "forJen", label: "For Jen", placeholder: "Anything else your coach should know…" },
];

const NAVY = "#132449";
const GREEN = "#2f7d52";
const BLUE = "#3a6ec4";
const GREY = "#e4e2db";
const MUTED = "#8a8aa0";

export function CheckIn({
  sessionId,
  label,
  dayCount,
  hours,
  initialDays,
  initialDay,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { status, enqueue, retry } = useSaveQueue();

  const [days, setDays] = useState<DayLog[]>(initialDays);
  const [day, setDay] = useState(initialDay);
  const [openHour, setOpenHour] = useState<number | null>(null);
  const [finishing, startFinishing] = useTransition();

  // Latest notes, read by the debounced writer so it never sends stale text.
  const daysRef = useRef(days);
  useEffect(() => {
    daysRef.current = days;
  }, [days]);
  const noteTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const current = days[day] ?? emptyDay();
  const slotCount = hours.length;
  const dayNumber = day + 1;

  // ── writes ──────────────────────────────────────────────────────────────

  const pickTile = (hour: number, value: number) => {
    const previous = current.slots[hour];
    // Tapping the level that's already selected clears the hour. The
    // prototype had no way to undo a mis-tap, and a mis-tapped hour would
    // otherwise be recorded as real data rather than a skip.
    const next = previous === value ? undefined : value;

    setDays((all) =>
      all.map((d, i) => {
        if (i !== day) return d;
        const slots = { ...d.slots };
        if (next === undefined) delete slots[hour];
        else slots[hour] = next;
        return { ...d, slots };
      }),
    );
    setOpenHour(next === undefined ? null : hour);

    const slotHour = `${String(hour).padStart(2, "0")}:00`;
    const thisDay = dayNumber;

    enqueue(`entry:${thisDay}:${hour}`, async () => {
      // No row for a skipped hour, ever — that's what keeps averages honest.
      const { error } =
        next === undefined
          ? await supabase
              .from("daily_entries")
              .delete()
              .match({ session_id: sessionId, day_number: thisDay, slot_hour: slotHour })
          : await supabase.from("daily_entries").upsert(
              {
                session_id: sessionId,
                day_number: thisDay,
                slot_hour: slotHour,
                energy_pct: next,
              },
              { onConflict: "session_id,day_number,slot_hour" },
            );
      if (error) throw error;
    });
  };

  const flushNotes = useCallback(
    (dayIndex: number) => {
      const timer = noteTimers.current.get(dayIndex);
      if (timer === undefined) return;
      clearTimeout(timer);
      noteTimers.current.delete(dayIndex);

      const d = daysRef.current[dayIndex];
      enqueue(`notes:${dayIndex + 1}`, async () => {
        const { error } = await supabase.from("daily_notes").upsert(
          {
            session_id: sessionId,
            day_number: dayIndex + 1,
            feel_note: d.feel || null,
            unexpected_note: d.unexpected || null,
            for_jen_note: d.forJen || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "session_id,day_number" },
        );
        if (error) throw error;
      });
    },
    [enqueue, sessionId, supabase],
  );

  const editNote = (field: NoteField, text: string) => {
    setDays((all) => all.map((d, i) => (i === day ? { ...d, [field]: text } : d)));
    const existing = noteTimers.current.get(day);
    if (existing !== undefined) clearTimeout(existing);
    const dayIndex = day;
    // Mark as pending, then flush once typing pauses.
    noteTimers.current.set(
      dayIndex,
      setTimeout(() => flushNotes(dayIndex), NOTE_DEBOUNCE_MS),
    );
  };

  // Don't lose a half-typed reflection when the tab is hidden or closed.
  useEffect(() => {
    const flushAll = () => {
      for (const dayIndex of [...noteTimers.current.keys()]) flushNotes(dayIndex);
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
  }, [flushNotes]);

  const goToDay = (next: number) => {
    flushNotes(day);
    setDay(next);
    setOpenHour(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── progress ────────────────────────────────────────────────────────────

  const doneDays = days.filter((d) => isComplete(d, slotCount)).length;
  const streakText = doneDays
    ? `${doneDays} ${doneDays === 1 ? "day" : "days"} complete`
    : "Complete a day to start your streak";

  const statusNote =
    status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "";

  return (
    <AppShell
      subtitle={label}
      badge={`Day ${dayNumber} of ${dayCount}`}
      progress={{ total: dayCount + 2, current: dayNumber }}
    >
      {/* Day tabs */}
      <div className="flex gap-[7px] overflow-x-auto border-b border-line bg-white px-[18px] pt-[14px] pb-3">
        {days.map((d, i) => {
          const done = isComplete(d, slotCount);
          const active = i === day;
          const colour = done ? GREEN : NAVY;
          return (
            <button
              key={i}
              type="button"
              onClick={() => goToDay(i)}
              aria-current={active ? "step" : undefined}
              className="min-w-[52px] flex-none rounded-[22px] border-[1.5px] px-3 py-[9px] text-[12.5px] font-extrabold"
              style={{
                background: active ? colour : "#fff",
                color: active ? "#fff" : done ? GREEN : MUTED,
                borderColor: active ? colour : done ? GREEN : GREY,
              }}
            >
              Day {i + 1}
            </button>
          );
        })}
      </div>

      {/* Streak */}
      <div className="flex items-center gap-[9px] border-b border-line bg-[#eef1f8] px-[18px] py-[11px]">
        <div className="flex gap-[5px]">
          {days.map((d, i) => {
            const n = loggedCount(d);
            const full = isComplete(d, slotCount);
            const style = full
              ? { background: GREEN, borderColor: GREEN, color: "#fff" }
              : n
                ? { background: "#eaf0fb", borderColor: BLUE, color: BLUE }
                : i === day
                  ? { background: "#fff", borderColor: NAVY, color: NAVY }
                  : { background: "#fff", borderColor: GREY, color: MUTED };
            return (
              <div
                key={i}
                className="flex h-[25px] w-[25px] items-center justify-center rounded-full border-2 text-[11px] font-extrabold"
                style={style}
                aria-hidden
              >
                {full ? "✓" : i + 1}
              </div>
            );
          })}
        </div>
        <div className="flex-1 text-[11.5px] leading-[1.4] font-bold text-body">
          {streakText}
        </div>
      </div>

      {/* Day heading */}
      <div className="px-[18px] pt-[18px] pb-2">
        <div className="mb-1 flex items-baseline justify-between">
          <h1 className="font-serif text-[22px] font-semibold text-navy">
            Day {dayNumber}
          </h1>
          <div
            className="text-[11px] font-extrabold tracking-[0.04em] text-gold"
            aria-live="polite"
          >
            {statusNote}
          </div>
        </div>
        <div className="text-[12px] leading-normal text-muted">
          {loggedCount(current)} of {slotCount} hours logged
        </div>
      </div>

      {status === "error" ? (
        <div
          role="alert"
          className="mx-[18px] mb-2 flex items-center justify-between gap-3 rounded-[11px] border-[1.5px] border-level-10/30 bg-level-10/8 px-[14px] py-[10px] text-[12.5px] font-semibold text-level-10"
        >
          <span>Some changes haven&rsquo;t saved. Check your connection.</span>
          <button type="button" onClick={retry} className="font-extrabold underline">
            Retry
          </button>
        </div>
      ) : null}

      {/* Scale header */}
      <div className="grid grid-cols-[56px_1fr] items-end px-[18px] pb-1">
        <div />
        <div className="grid grid-cols-5 gap-1">
          {SCALE.map((s) => (
            <div
              key={s.value}
              className="text-center text-[9.5px] leading-tight font-extrabold tracking-[0.02em]"
              style={{ color: s.color }}
            >
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* The grid */}
      <div className="px-[18px]">
        {hours.map((hour) => {
          const selected = current.slots[hour];
          const selectedScale = selected !== undefined ? scaleOf(selected) : null;
          return (
            <div key={hour}>
              <div
                className="grid grid-cols-[56px_1fr] items-center py-[3px]"
                role="radiogroup"
                aria-label={`${formatHour(hour)} charge level`}
              >
                <div className="text-[12px] font-extrabold whitespace-nowrap text-navy">
                  {formatHour(hour)}
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {SCALE.map((s) => {
                    const isSelected = selected === s.value;
                    return (
                      <button
                        key={s.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        aria-label={`${s.label} ${s.short}`}
                        title={`${s.label} ${s.short}`}
                        onClick={() => pickTile(hour, s.value)}
                        className="flex h-11 items-center justify-center rounded-[9px] border-[1.5px] text-[11px] font-extrabold transition-colors"
                        style={{
                          background: isSelected ? s.color : s.tint,
                          color: isSelected ? "#fff" : s.color,
                          borderColor: isSelected ? NAVY : "transparent",
                        }}
                      >
                        {isSelected ? s.label : ""}
                      </button>
                    );
                  })}
                </div>
              </div>

              {openHour === hour && selectedScale ? (
                <div
                  className="mt-px mb-2 rounded-r-[11px] border-l-[3px] px-[13px] py-[10px]"
                  style={{ background: selectedScale.tint, borderColor: selectedScale.color }}
                >
                  <div
                    className="mb-2 text-[9.5px] font-extrabold tracking-[0.11em] uppercase"
                    style={{ color: selectedScale.color }}
                  >
                    {selectedScale.label} {selectedScale.short} · {selectedScale.state}
                  </div>
                  <div className="flex flex-wrap gap-[5px]">
                    {selectedScale.keywords.map((k) => (
                      <span
                        key={k}
                        className="rounded-full border bg-white px-[11px] py-[5px] text-[11.5px] font-bold"
                        style={{ color: selectedScale.color, borderColor: selectedScale.color }}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Scale legend */}
      <div className="mx-[18px] mt-4 rounded-[14px] border border-line bg-white px-4 py-[15px]">
        <div className="mb-[5px] text-[10px] font-extrabold tracking-[0.13em] text-navy uppercase">
          The scale
        </div>
        <div className="flex flex-col gap-[6px]">
          {SCALE.map((s) => (
            <div key={s.value} className="flex items-baseline gap-[9px]">
              <span
                className="h-[9px] w-[9px] flex-none -translate-y-px rounded-full"
                style={{ background: s.color }}
              />
              <span className="w-16 flex-none text-[11.5px] font-extrabold text-navy">
                {s.label}
              </span>
              <span className="text-[11.5px] leading-[1.45] text-body">
                {s.short} — {s.desc}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reflections */}
      <div className="mx-[18px] mt-[14px] rounded-[14px] border border-line bg-white px-4 py-[15px]">
        <h2 className="mb-3 font-serif text-[16px] font-semibold text-navy">
          Today&rsquo;s reflection
        </h2>
        <div className="flex flex-col gap-[11px]">
          {REFLECTIONS.map((r) => (
            <div key={r.field}>
              <FieldLabel htmlFor={`reflection-${r.field}`}>{r.label}</FieldLabel>
              <textarea
                id={`reflection-${r.field}`}
                value={current[r.field]}
                onChange={(e) => editNote(r.field, e.target.value)}
                onBlur={() => flushNotes(day)}
                placeholder={r.placeholder}
                className="min-h-[62px] w-full resize-y rounded-[11px] border-[1.5px] border-line bg-white px-[13px] py-[11px] text-[13.5px] leading-[1.55] text-ink outline-none focus:border-navy"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Day navigation */}
      <div className="flex gap-[9px] px-[18px] pt-4 pb-[30px]">
        {day > 0 ? (
          <button
            type="button"
            onClick={() => goToDay(day - 1)}
            className="flex-none rounded-[12px] border-[1.5px] border-navy px-[18px] py-[14px] text-[14px] font-extrabold text-navy hover:bg-navy hover:text-white"
          >
            Back
          </button>
        ) : null}
        {day < dayCount - 1 ? (
          <button
            type="button"
            onClick={() => goToDay(day + 1)}
            className="flex-1 rounded-[12px] bg-navy py-[14px] text-[14.5px] font-extrabold text-white hover:bg-navy-light"
          >
            Next day
          </button>
        ) : (
          <button
            type="button"
            disabled={finishing}
            onClick={() => {
              flushNotes(day);
              startFinishing(() => completeSession(sessionId));
            }}
            className="flex-1 rounded-[12px] bg-gold py-[14px] text-center text-[14.5px] font-extrabold text-white shadow-[0_6px_18px_rgba(201,169,110,0.35)] hover:bg-gold-deep disabled:opacity-60"
          >
            {finishing ? "One moment…" : "See my results"}
          </button>
        )}
      </div>
    </AppShell>
  );
}
