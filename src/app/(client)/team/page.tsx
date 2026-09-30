import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { PageBody, PageHero, SectionLabel, Surface } from "@/components/AppShell";
import { InviteLink } from "@/components/coach/CompanyForms";
import { TeamPlanView } from "@/components/team/TeamPlanView";
import { TeamRoster } from "@/components/team/TeamRoster";
import { loadMyTeam, loadReleasedPlan, loadTeamProgress, inviteUrl } from "@/lib/teams";
import { requireViewer } from "@/lib/viewer";

/**
 * A person's team page.
 *
 * A member sees their team, the round they're tracking for, and their own
 * progress — nothing about anyone else (Jen and Josh, 2026-09-29). A lead sees
 * the same plus the member link and, from stage 2, the roster.
 */
export default async function TeamPage() {
  const { supabase, user } = await requireViewer("/team");

  const mine = await loadMyTeam(supabase, user.id);
  if (!mine) redirect("/setup");

  const { team, role, currentRound } = mine;
  const isLead = role === "lead";

  const { data: session } = currentRound
    ? await supabase
        .from("tracking_sessions")
        .select("id, status, day_count, daily_entries(count)")
        .eq("client_id", user.id)
        .eq("round_id", currentRound.id)
        .maybeSingle()
    : { data: null };

  // The lead hands this round; seats are what Jen opens once the company pays.
  const { data: invite } = isLead
    ? await supabase.from("team_invites").select("token").eq("team_id", team.id).eq("kind", "member").maybeSingle()
    : { data: null };
  const host = (await headers()).get("host") ?? "charge-index.vercel.app";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  const logged = session?.daily_entries?.[0]?.count ?? 0;
  // Progress only, and only for the lead — team_progress() enforces that too.
  const roster = isLead ? await loadTeamProgress(supabase, team.id) : [];
  // Only the lead, and only once Jen has released it.
  const released = isLead ? await loadReleasedPlan(supabase, team.id) : null;

  return (
    <>
      <PageHero
        eyebrow={isLead ? "Your team · you lead it" : "Your team"}
        title={<>{team.name}</>}
        lead={
          currentRound
            ? "Your team is tracking together. Log your own week exactly as you would on your own — what you log stays yours."
            : released
              ? "Your round is finished and Jen has sent your team's plan through. It's below."
              : "Nothing to track yet. Jen starts a round when your team is ready, and it'll appear here."
        }
      />

      <PageBody>
        <div className="grid items-start gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex min-w-0 flex-col gap-6">
            <Surface className="p-6 sm:p-8" accent={100}>
              <SectionLabel>{currentRound ? `Round ${currentRound.number}` : "Your tracking"}</SectionLabel>
              {currentRound ? (
                session ? (
                  <>
                    <div className="font-serif text-[30px] leading-tight font-semibold text-navy">
                      {session.status === "completed" ? "You're done" : `${logged} hours logged`}
                    </div>
                    <p className="mt-2 text-[14px] leading-[1.6] text-body">
                      {session.status === "completed"
                        ? "Thanks — your week is in. Jen builds the team's plan once everyone has finished."
                        : "Keep going: one tap an hour, and each hour stays open for 24 hours."}
                    </p>
                    <Link
                      href={session.status === "completed" ? `/track/${session.id}/complete` : `/track/${session.id}`}
                      className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-navy px-6 text-[14px] font-extrabold text-white transition hover:-translate-y-0.5"
                    >
                      {session.status === "completed" ? "See my own results" : "Keep logging"}
                    </Link>
                  </>
                ) : (
                  <>
                    <div className="font-serif text-[30px] leading-tight font-semibold text-navy">Set up your week</div>
                    <p className="mt-2 text-[14px] leading-[1.6] text-body">
                      Choose your waking hours and how many days you&rsquo;ll track. Your entries are yours — your team lead
                      only ever sees how far along you are.
                    </p>
                    <Link
                      href="/setup"
                      className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-navy px-6 text-[14px] font-extrabold text-white transition hover:-translate-y-0.5"
                    >
                      Start tracking
                    </Link>
                  </>
                )
              ) : released ? (
                <p className="m-0 text-[14px] leading-[1.6] text-body">
                  Round {released.roundNumber} is finished. Your team&rsquo;s plan is below; Jen starts another round when
                  you&rsquo;re ready to measure again.
                </p>
              ) : (
                <p className="m-0 text-[14px] leading-[1.6] text-body">
                  Your team hasn&rsquo;t started a round yet. Nothing to do until it does.
                </p>
              )}
            </Surface>

            {released ? (
              <Surface className="p-6 sm:p-8" accent="gold" delay={100}>
                <SectionLabel>
                  Your team&rsquo;s plan{released.roundNumber ? ` · round ${released.roundNumber}` : ""}
                </SectionLabel>
                <h2 className="mb-1 font-serif text-[26px] font-semibold text-navy">When your team works best</h2>
                <p className="mb-5 text-[13.5px] leading-[1.6] text-body">
                  Built by Jen from everyone&rsquo;s week. It describes the team, never a person.
                </p>
                <TeamPlanView plan={released.plan} />
                {released.plan.meet.length || released.plan.protect.length ? (
                  <a
                    href="/team/plan.ics"
                    className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-2xl bg-gold px-5 text-[13.5px] font-extrabold text-navy-deep transition hover:-translate-y-0.5 hover:bg-gold-bright"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
                      <rect x="4" y="5" width="16" height="15" rx="2" />
                      <path d="M8 3v4M16 3v4M4 10h16" />
                    </svg>
                    Put these blocks in my calendar
                  </a>
                ) : null}
              </Surface>
            ) : null}

            {isLead ? (
              <Surface className="p-6 sm:p-8" delay={120}>
                <SectionLabel>Your team</SectionLabel>
                <h2 className="mb-1 font-serif text-[24px] font-semibold text-navy">How everyone&rsquo;s doing</h2>
                <p className="mb-5 text-[13.5px] leading-[1.6] text-body">
                  How far through the week each person is. What they logged, and what it says about them, stays between
                  them and Jen.
                </p>
                <TeamRoster rows={roster} seats={team.seats} forLead />
              </Surface>
            ) : null}
          </div>

          {/* min-w-0: the invite link's nowrap token sets this column's
              minimum width otherwise, which widens the whole grid track. */}
          <div className="flex min-w-0 flex-col gap-5">
            {isLead ? (
              <Surface className="p-6 sm:p-7" accent="gold">
                <SectionLabel>Invite your team</SectionLabel>
                {team.seats === 0 ? (
                  <p className="m-0 text-[13.5px] leading-[1.6] text-body">
                    Your seats aren&rsquo;t open yet. Jen opens them once everything&rsquo;s settled on her side, and your
                    invite link appears here.
                  </p>
                ) : invite ? (
                  <InviteLink
                    label={`Member link · ${team.seats} seats`}
                    url={inviteUrl(origin, invite.token)}
                    hint="Send this to your team. It stops working once the team is full."
                  />
                ) : null}
              </Surface>
            ) : null}

            <Surface className="p-6 sm:p-7">
              <SectionLabel>What your lead sees</SectionLabel>
              <p className="m-0 text-[13.5px] leading-[1.6] text-body">
                {isLead
                  ? "You'll see who has joined and how far through the week each person is — never anyone's hours, curve or results. The team's plan comes to you from Jen when the round is done."
                  : "Only whether you've joined and how far along you are. Your hours, your curve and your results stay between you and Jen."}
              </p>
            </Surface>
          </div>
        </div>
      </PageBody>
    </>
  );
}
