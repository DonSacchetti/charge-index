"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { createSession } from "@/app/setup/actions";
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
    <form action={formAction}>
      <input type="hidden" name="wake_hour" value={wake} />
      <input type="hidden" name="sleep_hour" value={sleep} />
      <input type="hidden" name="day_count" value={dayCount} />
      <input type="hidden" name="reminder_pref" value={reminder} />

      <SectionLabel>Your details</SectionLabel>
      <div className="mb-[22px] flex flex-col gap-[11px]">
        <div>
          <FieldLabel>First name</FieldLabel>
          <input
            type="text"
            name="full_name"
            defaultValue={defaultName}
            required
            placeholder="e.g. Sarah"
            className={inputClass}
          />
        </div>
        <div>
          <FieldLabel>Email</FieldLabel>
          <input
            type="email"
            value={email}
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
            <FieldLabel>Wake</FieldLabel>
            <select
              value={wake}
              onChange={(e) => setWake(Number(e.target.value))}
              className={selectClass}
              aria-label="Wake time"
            >
              {WAKE_HOURS.map((h) => (
                <option key={h} value={h}>
                  {formatHourLong(h)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <FieldLabel>Bedtime</FieldLabel>
            <select
              value={sleep}
              onChange={(e) => setSleep(Number(e.target.value))}
              className={selectClass}
              aria-label="Bedtime"
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
          <FieldLabel>Session label</FieldLabel>
          <input
            type="text"
            name="label"
            placeholder="e.g. Spring 2026"
            className={inputClass}
          />
        </div>
      </div>

      <SectionLabel>Tracking length</SectionLabel>
      <div className="mb-[22px] flex gap-2">
        {DAY_COUNTS.map((d) => {
          const active = d === dayCount;
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDayCount(d)}
              aria-pressed={active}
              className={`flex-1 rounded-[11px] border-[1.5px] py-[13px] text-[14px] font-extrabold ${
                active
                  ? "border-navy bg-navy text-white"
                  : "border-line bg-white text-muted"
              }`}
            >
              {d} days
            </button>
          );
        })}
      </div>

      <SectionLabel>Nudge me</SectionLabel>
      <div className="mb-[22px] flex flex-col gap-[7px]">
        {REMINDERS.map((r) => {
          const active = r.value === reminder;
          return (
            <button
              key={r.value}
              type="button"
              onClick={() => setReminder(r.value)}
              aria-pressed={active}
              className={`flex w-full items-center gap-[11px] rounded-[11px] border-[1.5px] px-[14px] py-3 text-left ${
                active ? "border-navy bg-[#eef1f8]" : "border-line bg-white"
              }`}
            >
              <span
                className={`h-[17px] w-[17px] flex-none rounded-full border-2 ${
                  active
                    ? "border-navy bg-navy shadow-[inset_0_0_0_2.5px_#fff]"
                    : "border-line bg-white"
                }`}
              />
              <span className="flex-1">
                <span className="block text-[13.5px] font-extrabold text-navy">
                  {r.label}
                </span>
                <span className="mt-px block text-[11px] text-muted">
                  {r.detail}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mb-[22px] rounded-r-[12px] border-l-[3px] border-gold bg-[#eef1f8] px-4 py-[15px]">
        <div className="mb-[9px] text-[10px] font-extrabold tracking-[0.12em] text-navy uppercase">
          Before you start
        </div>
        <div className="flex flex-col gap-[7px] text-[12.5px] leading-[1.6] text-body">
          <div>
            <strong className="text-navy">No right or wrong.</strong> Be honest,
            don&rsquo;t judge the entry.
          </div>
          <div>
            <strong className="text-navy">Stay curious.</strong> This is
            discovery, not perfection.
          </div>
          <div>
            <strong className="text-navy">Consistency over perfection.</strong>{" "}
            Miss an hour, keep going.
          </div>
        </div>
      </div>

      <div className="mb-3">
        <FormError message={state?.error} />
      </div>

      <Submit />
    </form>
  );
}
