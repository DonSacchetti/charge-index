"use client";

import { useActionState } from "react";

import { type DraftState, draftInsights } from "@/app/coach/sessions/[sessionId]/actions";

export type SavedInsights = {
  energyType: string | null;
  insights: string[];
  recommendations: string[];
  generatedAt: string;
  model: string | null;
};

/**
 * The prototype's "Draft insights" panel. Copy is Jen's. Shows the cached
 * draft; generating or regenerating is always an explicit, paid press.
 */
export function InsightsCard({
  sessionId,
  configured,
  hasData,
  saved,
}: {
  sessionId: string;
  configured: boolean;
  hasData: boolean;
  saved: SavedInsights | null;
}) {
  const [state, action, pending] = useActionState<DraftState>(draftInsights.bind(null, sessionId), null);
  const error = state && "error" in state ? state.error : null;
  const canDraft = configured && hasData && !pending;

  return (
    <section className="rounded-[18px] bg-[linear-gradient(150deg,#0b1533,#132449)] p-[26px] text-white">
      <div className="mb-[6px] flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-[19px] font-semibold">Draft insights</h2>
          <p className="mt-1 text-[11.5px] text-white/55">Jen-side only. A starting point to edit, never sent as-is.</p>
        </div>
        <form action={action}>
          <button
            type="submit"
            disabled={!canDraft}
            className="flex-none rounded-[9px] border-[1.5px] border-white/30 bg-white/12 px-4 py-[10px] text-[12.5px] font-extrabold text-white hover:bg-white/22 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saved ? "Regenerate" : "Draft insights"}
          </button>
        </form>
      </div>

      {pending ? (
        <div className="flex items-center gap-[11px] py-4 text-[13px] text-white/75" role="status">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" aria-hidden />
          Reading the pattern…
        </div>
      ) : saved ? (
        <div>
          <div className="mt-4 mb-3 font-serif text-[22px] font-semibold text-gold">{saved.energyType}</div>
          <div className="mt-4 mb-1 text-[10px] font-extrabold tracking-[0.13em] text-white/50 uppercase">Observations</div>
          <ul className="m-0 list-none p-0">
            {saved.insights.map((x, i) => (
              <li key={i} className="border-b border-white/9 py-[7px] text-[13px] leading-[1.65] text-white/90">
                {x}
              </li>
            ))}
          </ul>
          <div className="mt-4 mb-1 text-[10px] font-extrabold tracking-[0.13em] text-white/50 uppercase">
            Peak Plan starting points
          </div>
          <ul className="m-0 list-none p-0">
            {saved.recommendations.map((x, i) => (
              <li key={i} className="border-b border-white/9 py-[7px] text-[13px] leading-[1.65] text-white/90">
                {x}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-white/45">
            Drafted {new Date(saved.generatedAt).toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" })}
            {saved.model ? ` · ${saved.model}` : ""}
          </p>
        </div>
      ) : (
        <p className="mt-[10px] text-[13px] leading-[1.7] text-white/70">
          Generates an energy-type label, observations and scheduling suggestions from the logged data — Jen&rsquo;s draft
          material for the Peak Plan™.
        </p>
      )}

      {!configured ? (
        <p className="mt-3 text-[12px] leading-[1.6] text-white/60">
          Not switched on yet: this needs an Anthropic API key added to the deployment.
        </p>
      ) : !hasData ? (
        <p className="mt-3 text-[12px] leading-[1.6] text-white/60">Nothing logged yet — there&rsquo;s no pattern to read.</p>
      ) : null}
      {error && !pending ? (
        <p className="mt-3 text-[12.5px] leading-[1.6] text-[#f3b6b6]" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
