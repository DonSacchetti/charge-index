import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/components/brand/AuthShell";
import { createClient } from "@/lib/supabase/server";

import { claimInvite } from "./actions";

/**
 * The end of an invite link.
 *
 * Signed out, it sends people to sign up and comes back here afterwards —
 * the token rides along in `next`, so a new member joins their team the
 * moment their account exists. Signed in, one button claims it.
 *
 * Nothing about the team is shown before joining: the token is a bearer
 * credential, and a stranger who tries a guess should learn nothing.
 */
export default async function JoinPage({ params, searchParams }: PageProps<"/join/[token]">) {
  const { token } = await params;
  const { error } = await searchParams;
  const message = typeof error === "string" ? error : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/signup?next=${encodeURIComponent(`/join/${token}`)}`);
  }

  // Already in a team? Straight to it; the action would only say the same.
  const { data: membership } = await supabase
    .from("team_memberships")
    .select("team_id")
    .eq("client_id", user.id)
    .maybeSingle();
  if (membership) redirect("/team");

  return (
    <AuthShell
      eyebrow="You've been invited"
      title="Join your team"
      lead="Your team is running the Charge Index together. You'll track your own week exactly like anyone else — your hours stay yours."
    >
      <div className="flex flex-col gap-4">
        {message ? (
          <p role="alert" className="m-0 rounded-2xl border-[1.5px] border-level-10/30 bg-level-10/10 px-4 py-3 text-[13px] font-bold text-level-10">
            {message}
          </p>
        ) : null}
        <p className="m-0 text-[14px] leading-[1.7] text-body">
          Joining links your account to your team. Your team lead sees <strong className="text-navy">how far along</strong>{" "}
          you are — never what you logged, and never your results.
        </p>
        <form action={claimInvite.bind(null, token)}>
          <button
            type="submit"
            className="inline-flex min-h-13 w-full items-center justify-center rounded-2xl bg-navy px-6 text-[15px] font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-navy-light"
          >
            Join the team
          </button>
        </form>
        <Link href="/setup" className="text-center text-[12.5px] font-bold text-muted underline">
          Not now — take me to my own Charge Index
        </Link>
      </div>
    </AuthShell>
  );
}
