"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { FieldLabel, PageBody, PageHero, SectionLabel, Surface } from "@/components/AppShell";
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
  /** Calendar date per day, "Mon, Sep 21", from the session's start date. */
  dayDates: string[];
  /**
   * How many days are open. A day opens on its own date, so nobody can fill
   * in a whole week in one sitting (Jen, 2026-09-24). The database enforces
   * the same rule — this only keeps the UI honest about it.
   */
  unlockedDays: number;
};

type NoteField = "feel" | "unexpected" | "forJen";

const NOTE_DEBOUNCE_MS = 700;

const REFLECTIONS: { field: NoteField; label: string; placeholder: string }[] = [
  { field: "feel", label: "How did you feel?", placeholder: "Energy, mood, mindset today…" },
  { field: "unexpected", label: "Anything unexpected?", placeholder: "Surprises, disruptions, wins…" },
  { field: "forJen", label: "For Jen", placeholder: "Anything else your coach should know…" },
];

export function CheckIn({
  sessionId,
  label,
  dayCount,
  hours,
  initialDays,
  initialDay,
  dayDates,
  unlockedDays,
}: Props) {
  const supabase = useMemo(() => createClient(), []);
  const { status, enqueue, retry } = useSaveQueue();

  const [days, setDays] = useState<DayLog[]>(initialDays);
  const [day, setDay] = useState(initialDay);
  const [openHour, setOpenHour] = useState<number | null>(null);
  const [finishing, startFinishing] = useTransition();
  const tabStrip = useRef<HTMLDivElement>(null);

  // Keep the active day's tab visible. On a 6–7 day session the later tabs
  // start off-screen on a phone, so day 7 would otherwise open with its own
  // tab hidden. Adjusts only the strip's scroll, never the page's.
  useEffect(() => {
    const strip = tabStrip.current;
    const tab = strip?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!strip || !tab) return;
    const left = tab.offsetLeft; // the strip is position: relative, so this is strip-relative
    const right = left + tab.offsetWidth;
    if (left < strip.scrollLeft) strip.scrollTo({ left: left - 18 });
    else if (right > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left: right - strip.clientWidth + 18 });
  }, [day]);

  // Latest notes, read by the debounced writer so it never sends stale text.
  const daysRef = useRef(days);
  useEffect(() => {
    daysRef.current = days;
  }, [days]);
  const noteTimers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const current = days[day] ?? emptyDay();
  const slotCount = hours.length;
  const dayNumber = day + 1;
  const locked = dayNumber > unlockedDays;
  /** True when there is a next day but it hasn't arrived yet. */
  const nextLocked = day + 1 < dayCount && day + 2 > unlockedDays;

  // ── writes ──────────────────────────────────────────────────────────────

  const pickTile = (hour: number, value: number) => {
    if (locked) return;
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
    if (locked) return;
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
    if (next + 1 > unlockedDays) return;
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

  const statusNote = status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "";
  const dayPct = slotCount ? Math.round((loggedCount(current) / slotCount) * 100) : 0;

  const dayButton = (i: number, layout: "chip" | "row") => {
    const d = days[i];
    const n = loggedCount(d);
    const done = isComplete(d, slotCount);
    const active = i === day;
    const shut = i + 1 > unlockedDays;
    if (layout === "chip") {
      return (
        <button
          key={i}
          type="button"
          onClick={() => goToDay(i)}
          disabled={shut}
          aria-current={active ? "step" : undefined}
          title={shut ? `Opens ${dayDates[i]}` : undefined}
          className={`flex min-h-11 flex-none flex-col items-start justify-center gap-0 rounded-2xl border-[1.5px] px-4 py-1.5 text-left transition ${
            shut
              ? "cursor-not-allowed border-line bg-cream text-muted"
              : active
                ? "border-transparent text-white shadow-[0_8px_20px_-8px_rgba(19,36,73,0.7)]"
                : done
                  ? "border-level-100/40 bg-level-100/8 text-level-100"
                  : "border-line bg-white text-navy"
          }`}
          style={!shut && active ? { background: done ? "var(--color-level-100)" : "var(--color-navy)" } : undefined}
        >
          <span className="flex items-center gap-1.5 text-[13px] font-extrabold whitespace-nowrap">
            {shut ? <span aria-hidden>🔒</span> : done ? <span aria-hidden>✓</span> : null}
            Day {i + 1}
          </span>
          <span className={`text-[10.5px] font-bold whitespace-nowrap ${active && !shut ? "text-white/70" : "text-muted"}`}>
            {dayDates[i]}
          </span>
        </button>
      );
    }
    return (
      <button
        key={i}
        type="button"
        onClick={() => goToDay(i)}
        disabled={shut}
        aria-current={active ? "step" : undefined}
        className={`group w-full rounded-2xl px-3 py-2.5 text-left transition ${
          shut ? "cursor-not-allowed opacity-55" : active ? "bg-navy text-white" : "hover:bg-cream"
        }`}
      >
        <span className="flex items-center justify-between text-[13px] font-extrabold">
          <span className="flex items-center gap-1.5">
            {shut ? <span aria-hidden>🔒</span> : null}Day {i + 1}
          </span>
          <span className={`text-[11px] font-bold ${active && !shut ? "text-white/70" : done ? "text-level-100" : "text-muted"}`}>
            {shut ? "locked" : done ? "✓ full" : `${n}/${slotCount}`}
          </span>
        </span>
        <span className={`mt-0.5 block text-[11px] font-bold ${active && !shut ? "text-white/60" : "text-muted"}`}>
          {dayDates[i]}
        </span>
        <span className={`mt-1.5 block h-1.5 overflow-hidden rounded-full ${active ? "bg-white/15" : "bg-cream"}`}>
          <span
            className="block h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${slotCount ? (n / slotCount) * 100 : 0}%`,
              background: done ? "var(--color-glow-100)" : "linear-gradient(90deg, var(--color-glow-75), var(--color-glow-50))",
            }}
          />
        </span>
      </button>
    );
  };

  // Hourly reminders, as a calendar file the phone can add in one tap. A web
  // page can't write into the Reminders app itself (no API exists), and the
  // calendar alert does the same job: a notification at the top of each hour.
  const reminders = (
    <Surface className="p-5" accent="gold" delay={160}>
      <SectionLabel>Reminders</SectionLabel>
      <p className="text-[13px] leading-[1.6] text-body">
        Add an alert at the top of every hour you&rsquo;re tracking, for the rest of this session. Your phone will ask
        once, then remind you until the session ends.
      </p>
      <a
        href={`/track/${sessionId}/reminders.ics`}
        className="mt-4 inline-flex min-h-12 items-center rounded-2xl bg-navy px-5 text-[13.5px] font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-navy-light"
      >
        Add hourly reminders
      </a>
      <p className="mt-3 text-[11.5px] leading-[1.5] text-muted">
        Opens in your calendar app — Apple Calendar, Google Calendar or Outlook — and adds one alert per hour.
      </p>
    </Surface>
  );

  const legend = (
    <Surface className="p-5" delay={200}>
      <SectionLabel>The scale</SectionLabel>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {SCALE.map((s) => (
          <li key={s.value} className="flex items-start gap-3">
            <span
              className="mt-[2px] flex h-7 w-11 flex-none items-center justify-center rounded-lg text-[11px] font-extrabold text-white"
              style={{ background: `linear-gradient(145deg, var(--color-glow-${s.value}), ${s.color})` }}
            >
              {s.label}
            </span>
            <span className="text-[12.5px] leading-[1.45] text-body">
              <strong className="text-navy">{s.short}</strong> — {s.desc}
            </span>
          </li>
        ))}
      </ul>
    </Surface>
  );

  return (
    <>
      <PageHero
        eyebrow={label}
        title={<>Day {dayNumber}</>}
        lead={
          locked ? (
            <>This day opens on {dayDates[day]}. One day at a time keeps the pattern real.</>
          ) : (
            <>
              {loggedCount(current)} of {slotCount} hours logged · {streakText}
            </>
          )
        }
        badge={`${dayDates[day]} · Day ${dayNumber} of ${dayCount}`}
        progress={{ total: dayCount + 2, current: dayNumber }}
      />

      <PageBody>
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
          <div className="flex min-w-0 flex-col gap-5">
            {/* Day chips — phones and tablets */}
            <Surface className="lg:hidden">
              <div ref={tabStrip} className="relative flex gap-2 overflow-x-auto px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {days.map((_, i) => dayButton(i, "chip"))}
              </div>
            </Surface>

            {status === "error" ? (
              <div
                role="alert"
                className="animate-pop flex items-center justify-between gap-3 rounded-2xl border-[1.5px] border-level-10/30 bg-level-10/10 px-4 py-3 text-[13px] font-bold text-level-10"
              >
                <span>Some changes haven&rsquo;t saved. Check your connection.</span>
                <button type="button" onClick={retry} className="inline-flex min-h-9 items-center px-2 font-extrabold underline">
                  Retry
                </button>
              </div>
            ) : null}

            {/* A day that hasn't arrived yet — Jen's pacing rule. */}
            {locked ? (
              <Surface className="p-6 text-center sm:p-10" accent={50} delay={60}>
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream text-[24px]" aria-hidden>
                  🔒
                </div>
                <h2 className="font-serif text-[24px] font-semibold text-navy">Day {dayNumber} opens {dayDates[day]}</h2>
                <p className="mx-auto mt-3 max-w-md text-[14px] leading-[1.7] text-body">
                  Your Charge Index measures real days as you live them, so each day unlocks on its own date. Come back
                  tomorrow — and if you missed an earlier day, you can still fill it in.
                </p>
                {unlockedDays > 0 ? (
                  <button
                    type="button"
                    onClick={() => goToDay(unlockedDays - 1)}
                    className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-navy px-6 text-[14px] font-extrabold text-white transition hover:-translate-y-0.5"
                  >
                    Go to day {unlockedDays}
                  </button>
                ) : null}
              </Surface>
            ) : null}

            {/* The grid */}
            <Surface className={`px-3 pt-5 pb-4 sm:px-6 sm:pt-6 ${locked ? "hidden" : ""}`} accent="spectrum" delay={60}>
              <div className="mb-4 flex items-center justify-between gap-3 px-1">
                <h2 className="font-serif text-[22px] font-semibold text-navy">One tap an hour</h2>
                <div className="flex items-center gap-2 text-[12px] font-extrabold text-muted">
                  <span className="relative h-2 w-20 overflow-hidden rounded-full bg-cream" aria-hidden>
                    <span className="spectrum absolute inset-y-0 left-0 rounded-full transition-[width] duration-500" style={{ width: `${dayPct}%` }} />
                  </span>
                  {dayPct}%
                </div>
              </div>

              <div className="grid grid-cols-[58px_1fr] items-end pb-2 sm:grid-cols-[72px_1fr]">
                <div />
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                  {SCALE.map((s) => (
                    <div key={s.value} className="text-center text-[10px] leading-tight font-extrabold sm:text-[11px]" style={{ color: s.color }}>
                      {s.label}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                {hours.map((hour) => {
                  const selected = current.slots[hour];
                  const selectedScale = selected !== undefined ? scaleOf(selected) : null;
                  return (
                    <div key={hour}>
                      <div
                        className="grid grid-cols-[58px_1fr] items-center py-[3px] sm:grid-cols-[72px_1fr]"
                        role="radiogroup"
                        aria-label={`${formatHour(hour)} charge level`}
                      >
                        <div className={`text-[12.5px] font-extrabold whitespace-nowrap sm:text-[13.5px] ${selectedScale ? "text-navy" : "text-body"}`}>
                          {formatHour(hour)}
                        </div>
                        <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                          {SCALE.map((s) => {
                            const isSelected = selected === s.value;
                            return (
                              <button
                                key={`${s.value}-${isSelected}`}
                                type="button"
                                role="radio"
                                aria-checked={isSelected}
                                aria-label={`${s.label} ${s.short}`}
                                title={`${s.label} ${s.short}`}
                                onClick={() => pickTile(hour, s.value)}
                                className={`relative flex h-12 items-center justify-center overflow-hidden rounded-xl text-[11.5px] font-extrabold transition duration-200 sm:h-[52px] sm:text-[12.5px] ${
                                  isSelected ? "animate-pop" : "hover:-translate-y-0.5 hover:brightness-95"
                                }`}
                                style={{
                                  background: s.tint,
                                  color: isSelected ? "#fff" : s.color,
                                  boxShadow: isSelected ? `0 12px 24px -10px var(--color-glow-${s.value})` : undefined,
                                }}
                              >
                                {isSelected ? (
                                  <span
                                    className="absolute inset-0"
                                    style={{
                                      background: `linear-gradient(180deg, var(--color-glow-${s.value}), ${s.color})`,
                                      animation: "fill-up 0.42s cubic-bezier(.2,.8,.2,1) both",
                                    }}
                                    aria-hidden
                                  />
                                ) : null}
                                <span className="relative">{isSelected ? s.label : ""}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {openHour === hour && selectedScale ? (
                        <div
                          className="animate-rise mt-1 mb-3 ml-0 rounded-2xl border-l-4 px-4 py-3 sm:ml-[72px]"
                          style={{ background: selectedScale.tint, borderColor: selectedScale.color }}
                        >
                          <div className="mb-2 text-[10.5px] font-extrabold tracking-[0.12em] uppercase" style={{ color: selectedScale.color }}>
                            {selectedScale.label} {selectedScale.short} · {selectedScale.state}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedScale.keywords.map((k, ki) => (
                              <span
                                key={k}
                                className="animate-pop rounded-full border bg-white px-3 py-1 text-[12px] font-bold"
                                style={{ color: selectedScale.color, borderColor: selectedScale.color, animationDelay: `${ki * 40}ms` }}
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
            </Surface>

            {/* Reflections */}
            <Surface className={`p-5 sm:p-7 ${locked ? "hidden" : ""}`} accent="gold" delay={120}>
              <h2 className="mb-1 font-serif text-[22px] font-semibold text-navy">Today&rsquo;s reflection</h2>
              <p className="mb-5 text-[13px] text-muted">A sentence or two is plenty.</p>
              <div className="grid gap-4 md:grid-cols-3">
                {REFLECTIONS.map((r) => (
                  <div key={r.field}>
                    <FieldLabel htmlFor={`reflection-${r.field}`}>{r.label}</FieldLabel>
                    <textarea
                      id={`reflection-${r.field}`}
                      value={current[r.field]}
                      onChange={(e) => editNote(r.field, e.target.value)}
                      onBlur={() => flushNotes(day)}
                      placeholder={r.placeholder}
                      rows={4}
                      className="w-full resize-y rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-[14px] leading-[1.55] text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/20"
                    />
                  </div>
                ))}
              </div>
            </Surface>

            <div className="flex flex-col gap-5 lg:hidden">
              {reminders}
              {legend}
            </div>

            {/* Day navigation. When tomorrow hasn't opened yet, the way on is
                to come back — but finishing early stays available, since some
                people stop at five days. */}
            {nextLocked ? (
              <p className="text-center text-[13px] font-bold text-muted">
                Day {day + 2} opens {dayDates[day + 1]}.
              </p>
            ) : null}
            <div className="flex gap-3">
              {day > 0 ? (
                <button
                  type="button"
                  onClick={() => goToDay(day - 1)}
                  className="min-h-13 flex-none rounded-2xl border-[1.5px] border-navy bg-white px-6 text-[14.5px] font-extrabold text-navy transition hover:bg-navy hover:text-white"
                >
                  Back
                </button>
              ) : null}
              {day < dayCount - 1 && !nextLocked ? (
                <button
                  type="button"
                  onClick={() => goToDay(day + 1)}
                  className="group relative min-h-13 flex-1 overflow-hidden rounded-2xl bg-navy text-[15px] font-extrabold text-white shadow-[0_14px_30px_-14px_rgba(19,36,73,0.9)] transition hover:-translate-y-0.5"
                >
                  <span className="spectrum-animated absolute inset-x-0 bottom-0 h-[3px]" aria-hidden />
                  Next day →
                </button>
              ) : (
                <button
                  type="button"
                  disabled={finishing}
                  onClick={() => {
                    flushNotes(day);
                    startFinishing(() => completeSession(sessionId));
                  }}
                  className="min-h-13 flex-1 rounded-2xl bg-gold text-center text-[15px] font-extrabold text-navy-deep shadow-[0_14px_34px_-12px_rgba(201,169,110,0.8)] transition hover:-translate-y-0.5 hover:bg-gold-bright disabled:opacity-60"
                >
                  {finishing ? "One moment…" : nextLocked ? "Finish early and see my results" : "See my results"}
                </button>
              )}
            </div>
          </div>

          {/* Sidebar — desktop */}
          <aside className="hidden flex-col gap-5 lg:sticky lg:top-24 lg:flex">
            <Surface className="p-4" accent="spectrum" delay={100}>
              <div className="px-2 pt-1 pb-3">
                <SectionLabel>Your days</SectionLabel>
                <p className="-mt-1 text-[12.5px] font-bold text-body">{streakText}</p>
              </div>
              <div className="flex flex-col gap-1">{days.map((_, i) => dayButton(i, "row"))}</div>
            </Surface>
            {reminders}
            {legend}
          </aside>
        </div>
      </PageBody>

      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-[calc(84px+env(safe-area-inset-bottom))] z-50 md:bottom-6"
      >
        {statusNote ? (
          <span
            key={statusNote}
            className={`animate-pop inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12.5px] font-extrabold shadow-[0_10px_30px_-10px_rgba(19,36,73,0.6)] ${
              status === "saved" ? "bg-level-100 text-white" : "bg-navy text-white"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${status === "saved" ? "bg-white" : "animate-pulse bg-gold-bright"}`} />
            {statusNote}
          </span>
        ) : null}
      </div>
    </>
  );
}
