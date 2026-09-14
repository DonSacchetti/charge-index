/** One day of a client's log, keyed by hour number (6, 7, … 23, 0). */
export type DayLog = {
  slots: Record<number, number>;
  feel: string;
  unexpected: string;
  forJen: string;
};

export function emptyDay(): DayLog {
  return { slots: {}, feel: "", unexpected: "", forJen: "" };
}

export function loggedCount(day: DayLog | undefined): number {
  return day ? Object.keys(day.slots).length : 0;
}

export function isComplete(day: DayLog | undefined, slotCount: number): boolean {
  return slotCount > 0 && loggedCount(day) === slotCount;
}

function hasAnything(day: DayLog | undefined): boolean {
  return (
    !!day &&
    (loggedCount(day) > 0 || !!day.feel || !!day.unexpected || !!day.forJen)
  );
}

/**
 * Which day to open on. Resumes at the furthest day with anything logged — or
 * the day after it, if that day is already full. Deliberately not derived from
 * start_date: that would need the client's timezone, which isn't stored yet,
 * and Jen's guidance is "miss an hour, keep going", so the first incomplete
 * day would pin people to day 1 forever.
 */
export function resumeDay(days: DayLog[], slotCount: number): number {
  let furthest = -1;
  days.forEach((d, i) => {
    if (hasAnything(d)) furthest = i;
  });
  if (furthest === -1) return 0;
  if (isComplete(days[furthest], slotCount) && furthest < days.length - 1) {
    return furthest + 1;
  }
  return furthest;
}
