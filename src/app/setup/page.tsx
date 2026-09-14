import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";

import { SetupForm } from "./setup-form";

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/setup");

  const [{ data: profile }, { data: sessions }] = await Promise.all([
    supabase.from("profiles").select("full_name, role").eq("id", user.id).single(),
    supabase
      .from("tracking_sessions")
      .select("id, label, day_count, status")
      .eq("client_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <AppShell subtitle="Getting set up" badge="5–7 days" progress={{ total: 7, current: 0 }}>
      <div className="px-5 pt-6 pb-9">
        <h1 className="font-serif text-[31px] leading-[1.14] font-semibold tracking-[-0.01em] text-navy">
          How charged
          <br />
          are you?
        </h1>
        <div className="my-[15px] h-0.5 w-[38px] bg-gold" />
        <p className="mb-[22px] text-[13.5px] leading-[1.72] text-body">
          Log your energy through your waking hours for five to seven days. Five
          choices every time, from{" "}
          <strong className="text-navy">100% Fully Charged</strong> down to{" "}
          <strong className="text-navy">10% Recharge Needed</strong>. No right or
          wrong answers — it&rsquo;s data, not a grade.
        </p>

        {sessions && sessions.length > 0 ? (
          <div className="mb-[22px] rounded-[12px] border-[1.5px] border-line bg-white p-4">
            <div className="mb-[9px] text-[10px] font-extrabold tracking-[0.12em] text-muted uppercase">
              Your sessions
            </div>
            <div className="flex flex-col gap-2">
              {sessions.map((s) => {
                const done = s.status === "completed";
                return (
                  <Link
                    key={s.id}
                    // Completed sessions go back to their results, not the log.
                    href={done ? `/track/${s.id}/complete` : `/track/${s.id}`}
                    className="flex items-center justify-between gap-3 text-[13.5px] font-bold text-navy underline"
                  >
                    <span>{s.label ?? "Untitled session"}</span>
                    <span className="text-[11px] font-semibold text-muted no-underline">
                      {done ? "Complete" : "In progress"} · {s.day_count} days
                    </span>
                  </Link>
                );
              })}
            </div>
            <p className="mt-[9px] text-[11.5px] text-muted">
              Starting a new session below won&rsquo;t touch these.
            </p>
          </div>
        ) : null}

        <SetupForm
          defaultName={profile?.full_name ?? ""}
          email={user.email ?? ""}
        />

        {profile?.role === "coach" || profile?.role === "admin" ? (
          <p className="mt-5 text-center">
            <Link href="/coach" className="text-[12px] font-bold text-navy underline">
              Go to coach view
            </Link>
          </p>
        ) : null}

        <form action={signOut} className="mt-5 text-center">
          <button
            type="submit"
            className="text-[12px] font-bold text-muted underline"
          >
            Sign out
          </button>
        </form>
      </div>
    </AppShell>
  );
}
