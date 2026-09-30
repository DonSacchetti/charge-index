"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { type CompanyState, createCompany, createTeam } from "@/app/coach/companies/actions";

const input =
  "w-full rounded-[11px] border-[1.5px] border-line bg-white px-[13px] py-[11px] text-[13.5px] text-ink outline-none focus:border-navy";
const button =
  "inline-flex min-h-11 flex-none items-center rounded-xl bg-navy px-5 text-[13px] font-extrabold text-white transition hover:bg-navy-light disabled:opacity-60";

function Error({ state }: { state: CompanyState }) {
  if (!state?.error) return null;
  return (
    <p role="alert" className="m-0 text-[12.5px] font-bold text-level-10">
      {state.error}
    </p>
  );
}

export function NewCompanyForm() {
  const [state, action, pending] = useActionState<CompanyState, FormData>(createCompany, null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!pending && !state?.error) form.current?.reset();
  }, [pending, state]);

  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="company-name" className="mb-[5px] block text-[10.5px] font-extrabold tracking-[0.07em] text-navy uppercase">
            Company name
          </label>
          <input id="company-name" name="name" required maxLength={120} placeholder="e.g. Northwind Logistics" className={input} />
        </div>
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Adding…" : "Add company"}
        </button>
      </div>
      <Error state={state} />
    </form>
  );
}

export function NewTeamForm({ companyId }: { companyId: string }) {
  const [state, action, pending] = useActionState<CompanyState, FormData>(createTeam.bind(null, companyId), null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!pending && !state?.error) form.current?.reset();
  }, [pending, state]);

  return (
    <form ref={form} action={action} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor="team-name" className="mb-[5px] block text-[10.5px] font-extrabold tracking-[0.07em] text-navy uppercase">
            Team name
          </label>
          <input id="team-name" name="name" required maxLength={120} placeholder="e.g. Sales, Operations, Leadership" className={input} />
        </div>
        <button type="submit" disabled={pending} className={button}>
          {pending ? "Adding…" : "Add team"}
        </button>
      </div>
      <p className="m-0 text-[11.5px] text-muted">
        Creating a team also creates its two links: one for the team lead, one for everyone else.
      </p>
      <Error state={state} />
    </form>
  );
}

/**
 * A link with a copy button. The lead's link is sent by Jen; the member's link
 * is handed round by the lead once seats are open.
 */
export function InviteLink({ label, url, hint, muted }: { label: string; url: string; hint?: string; muted?: boolean }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className={muted ? "opacity-60" : undefined}>
      <div className="mb-[5px] text-[10.5px] font-extrabold tracking-[0.07em] text-navy uppercase">{label}</div>
      <div className="flex flex-wrap items-center gap-2">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-[9px] bg-[#f4f3ef] px-3 py-2 text-[11.5px] whitespace-nowrap text-body">
          {url}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              setCopied(false);
            }
          }}
          className="inline-flex min-h-10 items-center rounded-xl border-[1.5px] border-line bg-white px-4 text-[12.5px] font-extrabold text-navy transition hover:border-navy"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {hint ? <p className="m-0 mt-1 text-[11.5px] text-muted">{hint}</p> : null}
    </div>
  );
}
