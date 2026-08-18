import type { Database } from "@/lib/database.types";

export type ReminderPref = Database["public"]["Enums"]["reminder_pref"];

/**
 * The five charge levels. Values, names, colours and keyword sets are taken
 * verbatim from Jen's prototype (`Design/Prototypes/Charge Index App.dc.html`,
 * const SCALE) — that file is the reference implementation, not a moodboard.
 */
export const SCALE = [
  {
    value: 100,
    label: "100%",
    short: "Fully Charged",
    state: "Optimal",
    desc: "Vibrant, focused, cognitively alert.",
    keywords: [
      "Vibrant",
      "Focused",
      "Cognitively alert",
      "Laser-like focus",
      "Clear, sharp thinking",
      "Taking proactive action",
    ],
  },
  {
    value: 75,
    label: "75%",
    short: "Positively Charged",
    state: "Dynamic",
    desc: "Motivated, magnetic, embracing challenge.",
    keywords: [
      "Magnetic",
      "Motivated",
      "Driven",
      "Embracing challenges",
      "Communicating well",
      "Proactive decisions",
    ],
  },
  {
    value: 50,
    label: "50%",
    short: "Steady Charge",
    state: "Composed",
    desc: "Enough battery to continue with the day.",
    keywords: [
      "Composed",
      "Content",
      "Handling stress well",
      "Consistent energy",
      "Enough in the tank",
    ],
  },
  {
    value: 25,
    label: "25%",
    short: "Low Charge",
    state: "Drifting",
    desc: "Mind wandering, needs a recharge soon.",
    keywords: ["Mind wandering", "Restless", "Distracted", "Delaying tasks", "Fidgety"],
  },
  {
    value: 10,
    label: "10%",
    short: "Recharge Needed",
    state: "Depleted",
    desc: "Running on empty, pulled many directions.",
    keywords: [
      "Low energy",
      "Tired",
      "Pulled in many directions",
      "Negative self-talk",
      "Sluggish",
    ],
  },
] as const;

export type ChargeLevel = (typeof SCALE)[number];

export function scaleOf(value: number): ChargeLevel {
  return SCALE.find((s) => s.value === value) ?? SCALE[2];
}

/** Snap a raw entry to the nearest of the five stored tiers. */
export function nearestTier(pct: number): number {
  return SCALE.map((s) => s.value as number).reduce((a, b) =>
    Math.abs(b - pct) < Math.abs(a - pct) ? b : a,
  );
}

/**
 * Reminder options — copy matches the prototype's REMINDERS exactly; the
 * `value` is the database enum, which uses longer names than the prototype's
 * internal keys (halfday → three_times_daily, daily → once_daily).
 */
export const REMINDERS: {
  value: ReminderPref;
  label: string;
  detail: string;
}[] = [
  { value: "none", label: "No reminders", detail: "I'll log on my own" },
  { value: "hourly", label: "Hourly", detail: "Every 60 minutes while awake" },
  {
    value: "three_times_daily",
    label: "Three times a day",
    detail: "Morning, midday, evening",
  },
  { value: "once_daily", label: "Once a day", detail: "One catch-up nudge" },
];

export const DAY_COUNTS = [5, 6, 7] as const;
