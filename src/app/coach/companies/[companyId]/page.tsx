import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CoachShell } from "@/components/CoachShell";
import { InviteLink, NewTeamForm } from "@/components/coach/CompanyForms";
import { TeamPlanView } from "@/components/team/TeamPlanView";
import { TeamRoster } from "@/components/team/TeamRoster";
import type { TeamPlan } from "@/lib/team-plan";
import { computeTeamPlan, inviteUrl, loadTeamProgress } from "@/lib/teams";
import { requireCoach } from "@/lib/viewer";

import { releaseTeamPlan, setSeats, startRound, withdrawTeamPlan } from "../actions";

/** One company: its teams, their links, seats and rounds. */
export default async function CompanyPage({ params }: PageProps<"/coach/companies/[companyId]">) {
  const { companyId } = await params;
  const { supabase } = await requireCoach(`/coach/companies/${companyId}`);

  const [{ data: company }, { data: teams }, { data: invites }, { data: memberships }, { data: rounds }] =
    await Promise.all([
      supabase.from("companies").select("id, name, created_at").eq("id", companyId).maybeSingle(),
      supabase.from("teams").select("id, name, seats, lead_id, created_at").eq("company_id", companyId).order("name"),
      supabase.from("team_invites").select("team_id, kind, token, uses"),
      supabase.from("team_memberships").select("team_id, client_id, role, profiles(full_name, email)"),
      supabase.from("team_rounds").select("id, team_id, number, status, released_at").order("number", { ascending: false }),
    ]);

  if (!company) notFound();

  // Jen sees the same roster the lead does — she also has the full client
  // view of each member elsewhere, which the lead never gets.
  const { data: released } = await supabase.from("team_plans").select("round_id, team_id, released_at, plan");
  // A live preview while a round is running; once released, the stored plan —
  // which is what the lead actually has, and mustn't drift from it.
  const previews = new Map(
    await Promise.all(
      (rounds ?? [])
        .filter((r) => r.status === "tracking")
        .map(async (r) => [r.id, await computeTeamPlan(supabase, r.id)] as const),
    ),
  );
  const rosters = new Map(
    await Promise.all(
      (teams ?? []).map(async (t) => [t.id, await loadTeamProgress(supabase, t.id)] as const),
    ),
  );

  // The links are absolute so Jen can paste them straight into an email.
  const host = (await headers()).get("host") ?? "charge-index.vercel.app";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  return (
    <CoachShell>
      <Link href="/coach/companies" className="text-[12px] font-bold text-muted underline">
        ← Companies
      </Link>

      <div className="aurora animate-rise mt-3 mb-5 rounded-[28px] px-6 py-8 text-white shadow-[0_30px_70px_-35px_rgba(19,36,73,0.8)] sm:px-9">
        <div className="mb-[7px] text-[10px] font-extrabold tracking-[0.15em] text-white/50 uppercase">Company</div>
        <h1 className="font-serif text-[30px] leading-[1.15] font-semibold">{company.name}</h1>
        <p className="mt-[7px] text-[13.5px] text-white/75">
          {(teams ?? []).length} {(teams ?? []).length === 1 ? "team" : "teams"} · added {company.created_at.slice(0, 10)}
        </p>
      </div>

      <Card className="mb-5" accent="gold">
        <h2 className="mb-1 font-serif text-[20px] font-semibold text-navy">Add a team</h2>
        <NewTeamForm companyId={companyId} />
      </Card>

      {(teams ?? []).map((team) => {
        const own = (memberships ?? []).filter((m) => m.team_id === team.id);
        const lead = own.find((m) => m.role === "lead");
        const leadInvite = (invites ?? []).find((i) => i.team_id === team.id && i.kind === "lead");
        const memberInvite = (invites ?? []).find((i) => i.team_id === team.id && i.kind === "member");
        const teamRounds = (rounds ?? []).filter((r) => r.team_id === team.id);
        const current = teamRounds.find((r) => r.status === "tracking");
        // The round Jen is working with: the live one, else the latest.
        const shown = current ?? teamRounds[0];
        const shownPlan = shown
          ? previews.get(shown.id) ?? ((released ?? []).find((p) => p.round_id === shown.id)?.plan as TeamPlan | undefined)
          : undefined;
        const isReleased = Boolean(shown && (released ?? []).some((p) => p.round_id === shown.id));

        return (
          <Card key={team.id} className="mb-5" accent="spectrum">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-serif text-[22px] font-semibold text-navy">{team.name}</h2>
              <span className="text-[12px] font-bold text-muted">
                {own.length} of {team.seats || 0} seats taken
              </span>
            </div>

            <div className="mt-2 text-[13px] text-body">
              {lead ? (
                <>
                  Lead: <strong className="text-navy">{lead.profiles?.full_name || "Unnamed"}</strong>{" "}
                  <span className="text-muted">{lead.profiles?.email}</span>
                </>
              ) : (
                <span className="text-muted">No lead yet — send the lead link below.</span>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-4">
              {leadInvite ? (
                <InviteLink
                  label="Lead link — send this first"
                  url={inviteUrl(origin, leadInvite.token)}
                  hint={
                    team.lead_id
                      ? "Already claimed. It won't work again."
                      : "Single use: whoever opens it first becomes the team lead."
                  }
                  muted={Boolean(team.lead_id)}
                />
              ) : null}

              {memberInvite ? (
                <InviteLink
                  label="Member link — the lead hands this round"
                  url={inviteUrl(origin, memberInvite.token)}
                  hint={
                    team.seats === 0
                      ? "Closed until you set the seats below."
                      : `Works until the team is full (${own.length} of ${team.seats} taken).`
                  }
                  muted={team.seats === 0}
                />
              ) : null}

              <form action={setSeats.bind(null, companyId, team.id)} className="flex flex-wrap items-end gap-2">
                <div>
                  <label
                    htmlFor={`seats-${team.id}`}
                    className="mb-[5px] block text-[10.5px] font-extrabold tracking-[0.07em] text-navy uppercase"
                  >
                    Seats
                  </label>
                  <input
                    id={`seats-${team.id}`}
                    name="seats"
                    type="number"
                    min={0}
                    max={500}
                    defaultValue={team.seats}
                    className="w-28 rounded-[11px] border-[1.5px] border-line bg-white px-[13px] py-[11px] text-[13.5px] text-ink outline-none focus:border-navy"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center rounded-xl border-[1.5px] border-line bg-white px-5 text-[13px] font-extrabold text-navy transition hover:border-navy"
                >
                  Save seats
                </button>
                <p className="m-0 max-w-sm text-[11.5px] text-muted">
                  Set this once the company has paid. The lead counts as a seat.
                </p>
              </form>
            </div>

            {own.length ? (
              <div className="mt-5 border-t border-[#f0efea] pt-4">
                <h3 className="mb-3 text-[10.5px] font-extrabold tracking-[0.07em] text-navy uppercase">Progress</h3>
                <TeamRoster rows={rosters.get(team.id) ?? []} seats={team.seats} forLead={false} />
              </div>
            ) : null}

            <div className="mt-5 border-t border-[#f0efea] pt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-[13px] text-body">
                  {current ? (
                    <>
                      Round {current.number} is <strong className="text-level-100">tracking</strong>.
                    </>
                  ) : teamRounds.length ? (
                    <>Last round finished. Start another when they&rsquo;re ready to measure again.</>
                  ) : (
                    <>No round yet. Start one when the team is ready to track.</>
                  )}
                </div>
                <form action={startRound.bind(null, companyId, team.id)}>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 items-center rounded-xl bg-navy px-5 text-[13px] font-extrabold text-white transition hover:bg-navy-light"
                  >
                    {teamRounds.length ? "Start a new round" : "Start the first round"}
                  </button>
                </form>
              </div>
              {teamRounds.length ? (
                <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0 text-[11.5px] text-muted">
                  {teamRounds.map((r) => (
                    <li key={r.id} className="rounded-full border border-line px-3 py-1">
                      Round {r.number} · {r.status}
                    </li>
                  ))}
                </ul>
              ) : null}

              {/* The plan Jen releases by hand — a live preview while the
                  round runs, the stored plan once it's out (2026-09-29). */}
              {shown && shownPlan ? (
                <div className="mt-5 rounded-2xl border border-line p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="m-0 font-serif text-[18px] font-semibold text-navy">
                      Round {shown.number} plan
                      {isReleased ? (
                        <span className="ml-2 text-[11px] font-bold text-level-100 uppercase">released</span>
                      ) : (
                        <span className="ml-2 text-[11px] font-bold text-muted uppercase">not released</span>
                      )}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      <form action={releaseTeamPlan.bind(null, companyId, team.id, shown.id)}>
                        <button
                          type="submit"
                          className="inline-flex min-h-10 items-center rounded-xl bg-navy px-4 text-[12.5px] font-extrabold text-white transition hover:bg-navy-light"
                        >
                          {isReleased ? "Rebuild from the latest data" : "Release to the lead"}
                        </button>
                      </form>
                      {isReleased ? (
                        <form action={withdrawTeamPlan.bind(null, companyId, shown.id)}>
                          <button type="submit" className="inline-flex min-h-10 items-center px-2 text-[12px] font-bold text-muted underline hover:text-navy">
                            Take it back
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                  <TeamPlanView plan={shownPlan} preview={!isReleased} />
                </div>
              ) : null}
            </div>
          </Card>
        );
      })}
    </CoachShell>
  );
}
