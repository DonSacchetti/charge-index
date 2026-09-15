"use server";

import { revalidatePath } from "next/cache";

import { buildInsightsPrompt } from "@/lib/insights";
import { insightsConfigured, requestInsights } from "@/lib/insights-client";
import { loadSessionAnalysis } from "@/lib/session-data";
import { requireCoach } from "@/lib/viewer";

export type DraftState = { error: string } | { done: true } | null;

/** Don't spend twice on an accidental double-press. */
const COOLDOWN_MS = 30_000;

/**
 * Draft (or regenerate) AI insights for a session. Each press is a paid API
 * call, so generation is only ever explicit and the result is cached in
 * ai_insights — viewing the page never calls the API.
 */
export async function draftInsights(sessionId: string): Promise<DraftState> {
  const { supabase } = await requireCoach(`/coach/sessions/${sessionId}`);

  if (!insightsConfigured()) {
    return { error: "AI insights aren't switched on yet — add ANTHROPIC_API_KEY to the deployment." };
  }

  const data = await loadSessionAnalysis(supabase, sessionId);
  if (!data) return { error: "That session couldn't be found." };
  if (data.entries.length === 0) return { error: "Nothing logged yet — there's no pattern to read." };

  const { data: existing } = await supabase
    .from("ai_insights")
    .select("generated_at")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (existing && Date.now() - Date.parse(existing.generated_at) < COOLDOWN_MS) {
    return { error: "A draft was just generated. Give it a moment before regenerating." };
  }

  const result = await requestInsights(
    buildInsightsPrompt({
      clientName: data.clientName,
      label: data.session.label,
      wake: data.wake,
      sleep: data.sleep,
      dayCount: data.session.day_count,
      hours: data.hours,
      entries: data.entries,
      map: data.map,
      windows: data.windows,
      reflections: data.reflections,
    }),
  );
  if (!result.ok) return { error: result.error };

  const { error } = await supabase.from("ai_insights").upsert(
    {
      session_id: sessionId,
      energy_type: result.insights.energyType,
      insights: result.insights.insights,
      recommendations: result.insights.recommendations,
      generated_at: new Date().toISOString(),
      model: result.model,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
    },
    { onConflict: "session_id" },
  );
  if (error) return { error: `The draft was generated but couldn't be saved: ${error.message}` };

  console.info(
    `AI insights drafted for session ${sessionId}: ${result.model}, ${result.inputTokens} in / ${result.outputTokens} out tokens`,
  );
  revalidatePath(`/coach/sessions/${sessionId}`);
  return { done: true };
}
