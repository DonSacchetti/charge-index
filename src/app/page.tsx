import Link from "next/link";
import { redirect } from "next/navigation";

import { SCALE } from "@/lib/charge";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    redirect(profile?.role === "coach" || profile?.role === "admin" ? "/coach" : "/setup");
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <div className="h-8 w-8 rounded-full bg-navy" />
          <div>
            <div className="text-[11px] font-extrabold tracking-[0.16em] text-navy uppercase">
              Soenen Strategies
            </div>
            <div className="text-[11px] text-muted">Jen Soenen · Time Strategist</div>
          </div>
          <Link
            href="/login"
            className="ml-auto text-[12px] font-bold text-navy underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-20">
        <p className="text-[11px] font-extrabold tracking-[0.2em] text-gold-deep uppercase">
          Charge Index™
        </p>
        <h1 className="mt-5 font-serif text-5xl leading-tight font-semibold text-navy sm:text-6xl">
          How charged
          <br />
          are you?
        </h1>
        <div className="mt-6 h-0.5 w-14 bg-gold" />
        <p className="mt-6 max-w-md text-base leading-relaxed text-body">
          Log your energy through your waking hours for five to seven days. Five
          choices every time, from 100% Fully Charged down to 10% Recharge
          Needed. No right or wrong answers — it&rsquo;s data, not a grade.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link
            href="/signup"
            className="rounded-[13px] bg-navy px-7 py-4 text-[15px] font-extrabold text-white shadow-[0_6px_20px_rgba(19,36,73,0.28)] transition-colors hover:bg-navy-light"
          >
            Start tracking
          </Link>
          <Link href="/login" className="text-[13.5px] font-bold text-navy underline">
            I already have an account
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-5 gap-2">
          {SCALE.map((s) => (
            <div
              key={s.value}
              className="overflow-hidden rounded-xl border border-line bg-white"
            >
              <div
                className="h-1.5"
                style={{ background: `var(--color-level-${s.value})` }}
              />
              <div className="px-3 py-4">
                <div className="font-serif text-xl font-semibold text-navy">
                  {s.label}
                </div>
                <div className="mt-1 text-[10px] leading-tight font-bold text-muted">
                  {s.short}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
