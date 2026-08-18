/**
 * Slot generation for a tracking session.
 *
 * Two deliberate differences from the pseudocode in Planning/Build Plan.md
 * Section 3, both taken from Jen's prototype (`slots()` in
 * `Design/Prototypes/Charge Index App.dc.html`), which the Build Plan names as
 * the reference implementation:
 *
 *   1. The bedtime hour is EXCLUSIVE. Wake 6am / bed 10pm gives 6:00–21:00
 *      (16 slots), not 17 — you don't log the hour you go to bed.
 *   2. Bedtimes after midnight work. The prototype offers 12 AM and 1 AM as
 *      bedtime options; those wrap past 24 rather than producing an empty day.
 */

/** Bedtimes at or before this hour are treated as "after midnight". */
const AFTER_MIDNIGHT_CUTOFF = 2;

/** Wake / bedtime choices offered in the UI — same lists as the prototype. */
export const WAKE_HOURS = [4, 5, 6, 7, 8, 9, 10, 11, 12];
export const SLEEP_HOURS = [18, 19, 20, 21, 22, 23, 0, 1];

/** "06:00" / "21:00" — matches the `time` columns in Postgres. */
export type SlotHour = string;

export function buildSessionSlots(wakeHour: number, sleepHour: number): SlotHour[] {
  const end = sleepHour <= AFTER_MIDNIGHT_CUTOFF ? sleepHour + 24 : sleepHour;
  const slots: SlotHour[] = [];
  for (let h = wakeHour; h < end; h++) {
    slots.push(`${String(h % 24).padStart(2, "0")}:00`);
  }
  return slots;
}

/** Parse a Postgres `time` value ("06:00:00") back to an hour number. */
export function hourOf(time: string): number {
  return parseInt(time.slice(0, 2), 10);
}

export function toTimeValue(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00:00`;
}

/** "6 AM" — compact label used in the log grid. */
export function formatHour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour < 12) return `${hour} AM`;
  if (hour === 12) return "12 PM";
  return `${hour - 12} PM`;
}

/** "6:00 AM" — long label used in the wake/bedtime pickers. */
export function formatHourLong(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}

/** Fallback session label, matching the prototype: "August 2026". */
export function defaultSessionLabel(now: Date): string {
  return now.toLocaleDateString("en-CA", { month: "long", year: "numeric" });
}
