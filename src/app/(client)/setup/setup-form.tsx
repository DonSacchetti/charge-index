"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { createSession } from "@/app/(client)/setup/actions";
import {
  FieldLabel,
  FormError,
  SectionLabel,
  SubmitButton,
  inputClass,
} from "@/components/AppShell";
import { DAY_COUNTS, REMINDERS, type ReminderPref } from "@/lib/charge";
import {
  SLEEP_HOURS,
  WAKE_HOURS,
  buildSessionSlots,
  formatHourLong,
} from "@/lib/slots";

function Submit() {
  const { pending } = useFormStatus();
  return <SubmitButton pending={pending}>Begin tracking</SubmitButton>;
}

const selectClass =
  "w-full rounded-[11px] border-[1.5px] border-line bg-white px-[10px] py-3 text-[14.5px] text-ink outline-none focus:border-navy focus:ring-[3px] focus:ring-navy/10";

export function SetupForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const [state, formAction] = useActionState(createSession, null);
  const [wake, setWake] = useState(6);
  const [sleep, setSleep] = useState(22);
  const [dayCount, setDayCount] = useState<number>(5);
  const [reminder, setReminder] = useState<ReminderPref>("none");

  const slotCount = buildSessionSlots(wake, sleep).length;

  return (
    <form
      action={(formData) => {
        // Stamp the client's own calendar date at submit time — the server
        // uses it for start_date instead of UTC, and falls back if it's absent.
        const d = new Date();
        formData.set(
          "local_date",
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        );
        // And their timezone, so reminders can fire at their own clock times.
        formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone ?? "");
        formAction(formData);
      }}
    >
      <input type="hidden" name="wake_hour" value={wake} />
      <input type="hidden" name="sleep_hour" value={sleep} />
      <input type="hidden" name="day_count" value={dayCount} />
      <input type="hidden" name="reminder_pref" value={reminder} />

      <SectionLabel>Your details</SectionLabel>
      <div className="mb-[22px] flex flex-col gap-[11px]">
        <div>
          <FieldLabel htmlFor="setup-name">First name</FieldLabel>
          <input
            type="text"
            name="full_name"
            id="setup-name"
            defaultValue={defaultName}
            required
            placeholder="e.g. Sarah"
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel htmlFor="setup-email">Email</FieldLabel>
          <input
            type="email"
            value={email}
            id="setup-email"
            readOnly
            aria-readonly
            className={`${inputClass} bg-[#f3f2ef] text-muted`}
          />
          <p className="mt-[5px] text-[11px] text-muted">
            The address on your account — this is where nudges go.
          </p>
        </div>
        <div className="flex gap-[10px]">
          <div className="flex-1">
            <FieldLabel htmlFor="setup-wake">Wake</FieldLabel>
            <select
              value={wake}
            id="setup-wake"
              onChange={(e) => setWake(Number(e.target.value))}
              className={selectClass}
            >
              {WAKE_HOURS.map((h) => (
                <option key={h} value={h}>
                  {formatHourLong(h)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <FieldLabel htmlFor="setup-bedtime">Bedtime</FieldLabel>
            <select
              value={sleep}
            id="setup-bedtime"
              onChange={(e) => setSleep(Number(e.target.value))}
              className={selectClass}
            >
              {SLEEP_HOURS.map((h) => (
                <option key={h} value={h}>
                  {formatHourLong(h)}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-[11.5px] text-muted">
          {slotCount > 0
            ? `${slotCount} hours to log each day.`
            : "That pairing leaves no hours to log — pick a later bedtime."}
        </p>
        <div>
          <FieldLabel htmlFor="setup-label">Session label</FieldLabel>
          <input
            type="text"
            name="label"
            id="setup-label"
            placeholder="e.g. Spring 2026"
            className={inputClass}
          />
        </div>
      </div>

      <SectionLabel>Tracking length</SectionLabel>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {DAY_COUNTS.map((d, i) => {
          const active = d === dayCount;
          const level = [75, 50, 100][i];
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDayCount(d)}
              aria-pressed={active}
              className={`relative overflow-hidden rounded-2xl border-[1.5px] py-4 transition hover:-translate-y-0.5 ${
                active ? "animate-pop border-transparent text-white shadow-[0_12px_28px_-12px_rgba(19,36,73,0.7)]" : "border-line bg-white text-navy"
              }`}
              style={active ? { background: `linear-gradient(145deg, var(--color-glow-${level}), var(--color-level-${level}))` } : undefined}
            >
              <span className="block font-serif text-[26px] leading-none font-semibold">{d}</span>
              <span className={`mt-1 block text-[11px] font-extrabold tracking-[0.08em] uppercase ${active ? "text-white/85" : "text-muted"}`}>days</span>
            </button>
          );
        })}
      </div>

      <SectionLabel>Nudge me</SectionLabel>
      <div className="mb-6 grid gap-2 sm:grid-cols-2">
        {REMINDERS.map((r, i) => {
          const active = r.value === reminder;
          const level = [50, 100, 75, 25][i];
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => setReminder(r.value)}
              aria-pressed={active}
              className={`flex w-full items-center gap-3 rounded-2xl border-[1.5px] px-4 py-3 text-left transition ${
                active ? "bg-white shadow-[0_10px_26px_-14px_rgba(19,36,73,0.55)]" : "border-line bg-white hover:border-navy/30"
              }`}
              style={active ? { borderColor: `var(--color-level-${level})` } : undefined}
            >
              <span
                className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border-2 transition ${active ? "animate-pop" : ""}`}
                style={{ borderColor: active ? `var(--color-level-${level})` : "var(--color-line)", background: active ? `var(--color-level-${level})` : "white" }}
              >
                {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-extrabold text-navy">{r.label}</span>
                <span className="mt-px block text-[11.5px] text-muted">{r.detail}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-3">
        <FormError message={state?.error} />
      </div>

      <Submit />
    </form>
  );
}
