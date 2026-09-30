"use client";

import { useActionState } from "react";

import { type CompanyState, deleteTeam, saveCompanyNotes } from "@/app/coach/companies/actions";

/** Jen's own notes about a company. Nobody at the company ever sees these. */
export function CompanyNotes({ companyId, notes }: { companyId: string; notes: string | null }) {
  const [state, action, pending] = useActionState<CompanyState, FormData>(saveCompanyNotes.bind(null, companyId), null);

  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="company-notes" className="text-[10.5px] font-extrabold tracking-[0.07em] text-navy uppercase">
        Notes
      </label>
      <textarea
        id="company-notes"
        name="notes"
        rows={4}
        maxLength={10000}
        defaultValue={notes ?? ""}
        placeholder="Who you're dealing with, what they've paid for, what to raise next time."
        className="w-full resize-y rounded-[11px] border-[1.5px] border-line bg-white px-[13px] py-[11px] text-[13.5px] leading-[1.55] text-ink outline-none focus:border-navy"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center rounded-xl bg-navy px-5 text-[13px] font-extrabold text-white transition hover:bg-navy-light disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save notes"}
        </button>
        {state?.error ? (
          <span role="alert" className="text-[12.5px] font-bold text-level-10">
            {state.error}
          </span>
        ) : null}
        <span className="text-[11.5px] text-muted">Private to coaches.</span>
      </div>
    </form>
  );
}

/**
 * Removing a team takes its rounds, invites, plans and membership with it, so
 * it asks first — the browser's own confirm, which is enough for a screen only
 * Jen reaches.
 */
export function RemoveTeam({ companyId, teamId, teamName }: { companyId: string; teamId: string; teamName: string }) {
  return (
    <form
      action={deleteTeam.bind(null, companyId, teamId)}
      onSubmit={(e) => {
        if (!confirm(`Remove ${teamName}? Its links, rounds and plans go with it. The people keep their own accounts.`)) {
          e.preventDefault();
        }
      }}
    >
      <button type="submit" className="inline-flex min-h-9 items-center px-2 text-[12px] font-bold text-muted underline hover:text-level-10">
        Remove team
      </button>
    </form>
  );
}
