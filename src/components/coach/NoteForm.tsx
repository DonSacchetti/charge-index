"use client";

import { useActionState, useEffect, useRef } from "react";

import { type NoteState, addNote } from "@/app/coach/clients/[clientId]/actions";

export function NoteForm({
  clientId,
  sessions,
}: {
  clientId: string;
  sessions: { id: string; label: string }[];
}) {
  const [state, action, pending] = useActionState<NoteState, FormData>(addNote.bind(null, clientId), null);
  const form = useRef<HTMLFormElement>(null);
  const savedAt = state && "saved" in state ? state.saved : null;

  // Clear the form once a note has actually saved.
  useEffect(() => {
    if (savedAt) form.current?.reset();
  }, [savedAt]);

  return (
    <form ref={form} action={action} className="flex flex-col gap-3">
      <div>
        <label htmlFor="note-body" className="mb-[5px] block text-[10.5px] font-extrabold tracking-[0.07em] text-navy uppercase">
          New note
        </label>
        <textarea
          id="note-body"
          name="body"
          required
          maxLength={5000}
          rows={3}
          placeholder="Only coaches can see these notes."
          className="w-full resize-y rounded-[11px] border-[1.5px] border-line bg-white px-[13px] py-[11px] text-[13.5px] leading-[1.55] text-ink outline-none focus:border-navy"
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {sessions.length ? (
          // min-w-0 + max-w-full: a <select> sizes itself to its longest option,
          // so a long session label would otherwise push the page wider than a phone.
          <div className="min-w-0 max-w-full">
            <label htmlFor="note-session" className="mb-[5px] block text-[10.5px] font-extrabold tracking-[0.07em] text-navy uppercase">
              About
            </label>
            <select
              id="note-session"
              name="session_id"
              defaultValue=""
              className="w-full max-w-full truncate rounded-[11px] border-[1.5px] border-line bg-white px-[10px] py-[9px] text-[13px] text-ink outline-none focus:border-navy sm:w-auto sm:max-w-sm"
            >
              <option value="">The client overall</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="rounded-[11px] bg-navy px-5 py-[10px] text-[13px] font-extrabold text-white hover:bg-navy-light disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add note"}
        </button>
      </div>
      {state && "error" in state ? (
        <p role="alert" className="text-[12.5px] font-semibold text-level-10">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
