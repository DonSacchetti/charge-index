import { timingSafeEqual } from "node:crypto";

import { dryRunSender, runReminders } from "@/lib/reminder-dispatch";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * The scheduled reminder run, called hourly by .github/workflows/reminders.yml
 * with `Authorization: Bearer <CRON_SECRET>`. Not a user-facing route: the
 * proxy lets it through without a session, and the secret is the only gate.
 *
 * Fails closed: with no CRON_SECRET configured every request is refused. With
 * no email provider configured the run is a dry run and reports what it would
 * have sent.
 */
export const dynamic = "force-dynamic";

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  if (!process.env.CRON_SECRET) {
    return Response.json({ error: "Reminders aren't configured (no CRON_SECRET)." }, { status: 503 });
  }
  if (!authorised(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.APP_URL || new URL(request.url).origin;
  const report = await runReminders(createAdminClient(), dryRunSender, new Date(), appUrl);
  console.info(`Reminder run (${report.sender}): ${report.sessionsChecked} sessions, ${report.planned} due, ${report.sent} sent, ${report.failed} failed`);
  return Response.json(report);
}
