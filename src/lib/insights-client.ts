import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";

import { INSIGHTS_SYSTEM, type Insights, InsightsSchema, normaliseInsights } from "@/lib/insights";

export const INSIGHTS_MODEL = "claude-opus-5";

export type InsightsResult =
  | {
      ok: true;
      insights: Insights;
      model: string;
      inputTokens: number;
      outputTokens: number;
    }
  | { ok: false; error: string };

/** True once an API key is configured for this deployment. */
export function insightsConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * One structured-output request to Claude. Never throws: every failure comes
 * back as a coach-readable message, since this runs from a button Jen presses.
 *
 * - Structured outputs (betaZodOutputFormat) guarantee the JSON shape.
 * - `fallbacks: "default"` lets the API re-run a policy-declined request on
 *   Anthropic's recommended fallback model server-side; `model` on the
 *   response records which model actually served it.
 * - The SDK already retries 408/409/429/5xx and connection errors twice.
 *
 * `client` is injectable for tests.
 */
export async function requestInsights(
  prompt: string,
  client: Anthropic = new Anthropic(),
): Promise<InsightsResult> {
  try {
    const response = await client.beta.messages.parse({
      model: INSIGHTS_MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: INSIGHTS_SYSTEM,
      messages: [{ role: "user", content: prompt }],
      output_config: { format: betaZodOutputFormat(InsightsSchema) },
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "Claude declined to draft insights for this session. Try again, or write them by hand." };
    }
    if (response.stop_reason === "max_tokens") {
      return { ok: false, error: "The draft ran too long and was cut off. Try again." };
    }
    if (!response.parsed_output) {
      return { ok: false, error: "The draft came back in an unexpected format. Try again." };
    }

    const insights = normaliseInsights(response.parsed_output);
    if (!insights.energyType || insights.insights.length === 0 || insights.recommendations.length === 0) {
      return { ok: false, error: "The draft came back incomplete. Try again." };
    }

    return {
      ok: true,
      insights,
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "The Anthropic API key was rejected. Check ANTHROPIC_API_KEY." };
    }
    if (error instanceof Anthropic.PermissionDeniedError) {
      return { ok: false, error: "The Anthropic account doesn't have access to this model or feature." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "Too many requests right now. Wait a minute and try again." };
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("Insights request rejected:", error.message);
      return { ok: false, error: "The request was rejected by the API. This needs a developer to look at." };
    }
    if (error instanceof Anthropic.APIConnectionError) {
      return { ok: false, error: "Couldn't reach the Anthropic API. Check the connection and try again." };
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Insights API error ${error.status}:`, error.message);
      return { ok: false, error: "The Anthropic API had a problem. Try again shortly." };
    }
    console.error("Insights request failed:", error);
    return { ok: false, error: "Something went wrong drafting insights. Try again." };
  }
}
