/**
 * Reminder email content. DRAFT COPY for Jen to review — her materials name
 * the reminder options but don't include any email wording.
 */

import { formatHour } from "@/lib/slots";

export type ReminderEmailInput = {
  clientName: string | null;
  sessionLabel: string | null;
  dayNumber: number;
  dayCount: number;
  unloggedHours: number[];
  url: string;
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function hoursPhrase(hours: number[]): string {
  if (hours.length === 1) return `your ${formatHour(hours[0])} hour`;
  if (hours.length <= 3) return `${hours.slice(0, -1).map(formatHour).join(", ")} and ${formatHour(hours.at(-1)!)}`;
  return `${hours.length} hours`;
}

export function renderReminderEmail(input: ReminderEmailInput): { subject: string; text: string; html: string } {
  const first = input.clientName?.trim().split(/\s+/)[0] || "there";
  const what = hoursPhrase(input.unloggedHours);
  const subject = input.unloggedHours.length === 1 ? "How charged were you?" : "A quick Charge Index catch-up";
  const day = `Day ${input.dayNumber} of ${input.dayCount}`;

  const text = [
    `Hi ${first},`,
    "",
    `A quick nudge to log ${what} — ${day}${input.sessionLabel ? ` of ${input.sessionLabel}` : ""}.`,
    "One tap per hour. No right or wrong answers — it's data, not a grade.",
    "",
    input.url,
    "",
    "— Soenen Strategies",
    "You chose these reminders when you set up your session.",
  ].join("\n");

  const html = `<div style="font-family:Nunito,Arial,sans-serif;color:#1a1a2e;max-width:480px;margin:0 auto;padding:24px">
<p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#a8844a;font-weight:800;margin:0 0 12px">Charge Index™</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 12px">Hi ${escapeHtml(first)},</p>
<p style="font-size:15px;line-height:1.6;margin:0 0 12px">A quick nudge to log ${escapeHtml(what)} — ${escapeHtml(day)}${input.sessionLabel ? ` of ${escapeHtml(input.sessionLabel)}` : ""}.</p>
<p style="font-size:14px;line-height:1.6;color:#4a4a65;margin:0 0 20px">One tap per hour. No right or wrong answers — it's data, not a grade.</p>
<p style="margin:0 0 24px"><a href="${escapeHtml(input.url)}" style="display:inline-block;background:#132449;color:#fff;text-decoration:none;font-weight:800;padding:12px 20px;border-radius:10px">Log my charge</a></p>
<p style="font-size:12px;line-height:1.6;color:#8a8aa0;margin:0">Soenen Strategies · You chose these reminders when you set up your session.</p>
</div>`;

  return { subject, text, html };
}
