import Link from "next/link";
import { redirect } from "next/navigation";

import { ChargeMeter } from "@/components/brand/ChargeMeter";
import { BOOK_CALL_URL, SiteFooter, SiteHeader } from "@/components/brand/SiteHeader";
import { SCALE } from "@/lib/charge";
import { createClient } from "@/lib/supabase/server";

const BOOK_SESSION_URL = "https://calendly.com/soenenstrategies/introtimestrategycall";

/* Copy below is Jen's, from Design/Prototypes/Charge Index Landing.dc.html. */

const PAINS = [
  { n: "01", t: "Overwhelmed", d: "Uncertain about how to manage your time to accelerate results.", level: 25 },
  { n: "02", t: "Pulled apart", d: "Confused and stressed because you're pulled in too many directions that only lead to dead ends.", level: 50 },
  { n: "03", t: "Stalled", d: "Frustrated by the lack of results that align with your vision, despite your hard work and effort.", level: 10 },
];

const STEPS = [
  { n: "01", t: "Complete the Charge Index", d: "Five to seven days, one tap an hour — five for a working week, seven if you want the whole picture." },
  { n: "02", t: "See your charge pattern", d: "Your curve and peak windows are mapped the moment you finish. No forms, no waiting, no sending anything anywhere." },
  { n: "03", t: "Turn it into a Peak Plan", d: "Take the automated Basic Peak Plan, or book a Peak Plan Session and we build the detailed version together." },
  { n: "04", t: "Implement and adjust weekly", d: "Small changes, big impact. Keep an accountability partner, or continue with me as your Time Strategy coach." },
];

const BENEFITS = [
  { t: "Be more productive", d: "Productive versus just feeling productive. Quality of work improves." },
  { t: "Gain quantitative data", d: "Numbers don't lie; they give you evidence you can act on." },
  { t: "Improve work-life alignment", d: "Allocate time better and reduce wasted hours." },
  { t: "Liberate your time", d: "Applying your plan to your schedule creates more free time." },
  { t: "A confidence boost", d: "Hit goals faster, take more risks, build momentum." },
  { t: "Think differently", d: "Trade the thoughts that led to overwhelm for control and responsibility." },
];

const TIERS = [
  {
    step: "Step one · free",
    name: "Charge Index™",
    price: "Free",
    desc: "Measure first. Everything else depends on this.",
    items: ["Five to seven days of one-tap tracking", "Your charge curve, hour by hour", "Your peak windows, identified — yours to keep"],
    cta: "Start tracking",
    href: "/signup",
    featured: false,
  },
  {
    step: "Step two · instant",
    name: "Basic Peak Plan™",
    price: "$49",
    desc: "Auto-generated from your data. No call needed.",
    items: ["Your full schedule, hour by hour, by charge level", "Your protected peak windows", "A calendar file you can drop into your week", "One-page PDF to keep"],
    cta: "Get the basic plan",
    href: "/signup",
    featured: true,
  },
  {
    step: "Step three · 90 minutes",
    name: "Peak Plan™ Session",
    price: "$249",
    desc: "One-to-one. Everything your numbers cannot see, decided together.",
    items: ["We read your Charge Index together", "Your detailed Peak Plan, built around your goals and commitments", "Your protected windows and weekly power list", "Tools and scripts for holding the boundary"],
    cta: "Book your session",
    href: BOOK_SESSION_URL,
    featured: false,
  },
  {
    step: "Step four · 12 weeks",
    name: "Time Strategy Coaching",
    price: "Investment discussed on our call",
    desc: "For when you want the habit to hold, not just the plan to exist.",
    items: ["Weekly power-focused sessions", "Unlimited text support between sessions", "Ongoing optimization as your season changes", "Accountability that keeps the plan alive"],
    cta: "Book a call with Jen",
    href: BOOK_CALL_URL,
    featured: false,
  },
];

const RESULTS = [
  { who: "Office manager", what: "Went from opening her laptop at night to leaving work at work — saving 10 hours." },
  { who: "Corporate client", what: "Moved staff meetings to a more ideal time and realized more productivity throughout the week, with more focused meetings." },
];

/** An illustrative day, 6 AM to 8 PM — a morning peak, an afternoon dip, an evening second wind. */
const SAMPLE_DAY = [45, 62, 80, 96, 100, 92, 74, 55, 38, 24, 30, 52, 70, 64, 40];

const external = (href: string) => href.startsWith("http");

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    redirect(profile?.role === "coach" || profile?.role === "admin" ? "/coach" : "/setup");
  }

  return (
    <div className="flex flex-1 flex-col">
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="aurora text-white">
        <SiteHeader tone="light" sections />
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pt-16 lg:pb-28">
          <div>
            <p className="animate-rise text-[11px] font-extrabold tracking-[0.22em] text-gold-bright uppercase">
              The Charge Index™ · free assessment
            </p>
            <h1 className="animate-rise mt-5 font-serif text-[52px] leading-[0.98] font-semibold tracking-[-0.02em] [animation-delay:80ms] sm:text-[76px]">
              How <span className="spectrum-text italic">charged</span>
              <br />
              are you?
            </h1>
            <p className="animate-rise mt-7 max-w-xl text-[17px] leading-[1.7] text-white/80 [animation-delay:160ms]">
              Not all hours are created equal. One hour of your peak performance can be worth two or three in a
              low-performance time of day.
            </p>
            <p className="animate-rise mt-4 max-w-xl text-[15px] leading-[1.7] text-white/65 [animation-delay:220ms]">
              Track your charge for five to seven days and see your peak windows, free. Turn them into a Peak Plan™
              when you are ready.
            </p>
            <div className="animate-rise mt-9 flex flex-wrap gap-3 [animation-delay:300ms]">
              <Link
                href="/signup"
                className="inline-flex min-h-13 items-center rounded-2xl bg-gold px-7 text-[15px] font-extrabold text-navy-deep shadow-[0_14px_40px_-12px_rgba(227,196,138,0.8)] transition hover:-translate-y-0.5 hover:bg-gold-bright"
              >
                Start the Charge Index
              </Link>
              <a
                href={BOOK_CALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-13 items-center rounded-2xl border-[1.5px] border-white/30 px-6 text-[14.5px] font-extrabold text-white transition hover:bg-white/10"
              >
                Book a call
              </a>
            </div>
            <p className="animate-rise mt-5 text-[12.5px] text-white/50 [animation-delay:360ms]">
              Five to seven days of tracking · one tap an hour · no cost
            </p>
          </div>

          <div className="animate-rise [animation-delay:250ms]">
            <div className="animate-float rounded-[28px] border border-white/12 bg-white/[0.06] p-6 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)] backdrop-blur-md sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-[10.5px] font-extrabold tracking-[0.18em] text-white/55 uppercase">A day, charted</span>
                <span className="rounded-full bg-glow-100/20 px-3 py-1 text-[11px] font-extrabold text-glow-100">Peak 9 AM – 11 AM</span>
              </div>
              <ChargeMeter values={SAMPLE_DAY} height={190} gap={6} className="mt-6" />
              <div className="mt-3 flex justify-between text-[11px] font-bold text-white/50">
                <span>6 AM</span>
                <span>1 PM</span>
                <span>8 PM</span>
              </div>
              <p className="mt-6 border-t border-white/10 pt-5 font-serif text-[17px] leading-[1.5] text-white/90 italic">
                Your peak window is a fact about you, not a guess. The Charge Index finds it; the Peak Plan protects it.
              </p>
            </div>
          </div>
        </div>
        <div className="spectrum-animated h-[4px]" />
      </section>

      {/* ── You're in the right place ───────────────────────────────────── */}
      <section className="grain bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="max-w-2xl font-serif text-[34px] leading-[1.15] font-semibold text-navy sm:text-[42px]">
            You&rsquo;re in the right place if you&rsquo;re done feeling
          </h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {PAINS.map((p) => (
              <div key={p.n} className="card-lift relative overflow-hidden rounded-3xl bg-white p-7 shadow-[0_2px_20px_rgba(19,36,73,0.06)]">
                <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `var(--color-level-${p.level})` }} />
                <div className="font-serif text-[40px] font-semibold" style={{ color: `var(--color-level-${p.level})` }}>
                  {p.n}
                </div>
                <h3 className="mt-2 font-serif text-[24px] font-semibold text-navy">{p.t}</h3>
                <p className="mt-2 text-[15px] leading-[1.65] text-body">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section id="how" className="scroll-mt-4 bg-cream">
        <div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.2em] text-gold-deep uppercase">How it works</p>
            <h2 className="mt-4 font-serif text-[36px] leading-[1.12] font-semibold text-navy sm:text-[44px]">
              Five to seven days of data.
              <br />
              <span className="text-level-75">One schedule that fits you.</span>
            </h2>
            <p className="mt-5 text-[15.5px] leading-[1.7] text-body">
              Evaluating where you are is the first step toward empowerment. No worries if you don&rsquo;t do it every
              hour — consistency over perfection.
            </p>
            <blockquote className="mt-8 rounded-2xl border-l-4 border-gold bg-white/70 px-6 py-5">
              <p className="font-serif text-[20px] leading-[1.4] text-navy italic">&ldquo;Words inspire, but only action creates change.&rdquo;</p>
              <footer className="mt-2 text-[12.5px] font-bold text-muted">Simon Sinek</footer>
            </blockquote>
          </div>
          <ol className="relative m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
            {STEPS.map((s, i) => (
              <li key={s.n} className="card-lift relative rounded-3xl bg-white p-6 shadow-[0_2px_20px_rgba(19,36,73,0.06)]">
                <div className="flex items-center gap-3">
                  <span
                    className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl font-serif text-[17px] font-semibold text-white"
                    style={{ background: `linear-gradient(135deg, var(--color-glow-${SCALE[i].value}), var(--color-level-${SCALE[i].value}))` }}
                  >
                    {s.n}
                  </span>
                  <h3 className="font-serif text-[19px] leading-tight font-semibold text-navy">{s.t}</h3>
                </div>
                <p className="mt-3 text-[14.5px] leading-[1.65] text-body">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── The scale ───────────────────────────────────────────────────── */}
      <section id="scale" className="aurora aurora-warm scroll-mt-4 text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <p className="text-[11px] font-extrabold tracking-[0.2em] text-gold-bright uppercase">The charge scale</p>
          <h2 className="mt-4 font-serif text-[36px] leading-[1.12] font-semibold sm:text-[44px]">Five levels. One tap an hour.</h2>
          <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-5">
            {SCALE.map((s, i) => (
              <div
                key={s.value}
                className="card-lift relative flex min-h-[240px] flex-col overflow-hidden rounded-3xl p-5"
                style={{ background: `linear-gradient(160deg, ${s.color}, rgba(11,21,51,0.2))` }}
              >
                <div
                  className="absolute inset-x-4 bottom-4 origin-bottom rounded-2xl bg-white/12"
                  style={{ height: `${Math.max(12, s.value) * 0.55}%`, animation: `charge-rise 1s cubic-bezier(.2,.8,.2,1) ${i * 90}ms both` }}
                  aria-hidden
                />
                <div className="relative font-serif text-[40px] leading-none font-semibold">{s.label}</div>
                <div className="relative mt-2 text-[14px] font-extrabold">{s.short}</div>
                <div className="relative mt-1 text-[11px] font-extrabold tracking-[0.14em] text-white/70 uppercase">{s.state}</div>
                <p className="relative mt-auto pt-4 text-[13px] leading-[1.5] text-white/85">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you get ────────────────────────────────────────────────── */}
      <section className="grain bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <p className="text-[11px] font-extrabold tracking-[0.2em] text-gold-deep uppercase">What you get</p>
          <h2 className="mt-4 font-serif text-[36px] leading-[1.12] font-semibold text-navy sm:text-[44px]">Your Peak Plan™</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFITS.map((b, i) => {
              const level = SCALE[i % 5].value;
              return (
                <div key={b.t} className="card-lift flex gap-4 rounded-3xl bg-white p-6 shadow-[0_2px_20px_rgba(19,36,73,0.06)]">
                  <span className="mt-1 flex h-9 flex-none items-end gap-[3px]" aria-hidden>
                    {[0.5, 0.8, 1].map((h, j) => (
                      <span key={j} className="w-[5px] rounded-[2px]" style={{ height: `${h * 100}%`, background: `var(--color-glow-${level})` }} />
                    ))}
                  </span>
                  <div>
                    <h3 className="font-serif text-[19px] font-semibold text-navy">{b.t}</h3>
                    <p className="mt-1 text-[14.5px] leading-[1.6] text-body">{b.d}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Jen ─────────────────────────────────────────────────────────── */}
      <section className="bg-cream">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-[11px] font-extrabold tracking-[0.2em] text-gold-deep uppercase">Who builds your plan</p>
            <h2 className="mt-4 font-serif text-[40px] leading-[1.1] font-semibold text-navy">Jen Soenen</h2>
            <p className="mt-1 text-[13px] font-extrabold tracking-[0.14em] text-level-75 uppercase">Time Strategist</p>
            <div className="mt-6 space-y-4 text-[15.5px] leading-[1.75] text-body">
              <p>I am a Time Strategist who enjoys helping others to manage their time optimally. I know from experience that this is the master key to living a fully charged life. My systems are strategic and simple to implement.</p>
              <p>Twenty years in a high school classroom teaches you two things: how to hold thirty different attention spans at once, and how to change the plan mid-lesson without losing the goal. That, plus my certification as a Mastery Coach, is what I bring to your calendar. I am a mother, partner, coach, teacher, and a lover of golf.</p>
              <p>Overall, I&rsquo;m on a mission to teach others how to gain more responsibility for our most precious non-renewable resource: TIME.</p>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <figure className="aurora m-0 rounded-3xl p-8 text-white">
              <blockquote className="font-serif text-[22px] leading-[1.45] italic">
                &ldquo;Working with Jen has helped me grow in so many ways, both personally and professionally. She is such a powerful coach!&rdquo;
              </blockquote>
              <figcaption className="mt-4 text-[13px] font-extrabold text-gold-bright">Brittany, FL</figcaption>
            </figure>
            {RESULTS.map((r, i) => (
              <div key={r.who} className="rounded-3xl bg-white p-6 shadow-[0_2px_20px_rgba(19,36,73,0.06)]">
                <div className="text-[11px] font-extrabold tracking-[0.14em] uppercase" style={{ color: i ? "var(--color-level-75)" : "var(--color-level-100)" }}>
                  {r.who}
                </div>
                <p className="mt-2 text-[15px] leading-[1.6] text-navy">{r.what}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plans ───────────────────────────────────────────────────────── */}
      <section id="plans" className="grain scroll-mt-4 bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <p className="text-[11px] font-extrabold tracking-[0.2em] text-gold-deep uppercase">Work with me</p>
          <h2 className="mt-4 font-serif text-[36px] leading-[1.12] font-semibold text-navy sm:text-[44px]">Four rungs. Everyone starts free.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {TIERS.map((t) => (
              <div
                key={t.name}
                className={`card-lift relative flex flex-col overflow-hidden rounded-3xl p-7 ${
                  t.featured ? "aurora text-white shadow-[0_30px_60px_-25px_rgba(19,36,73,0.7)]" : "bg-white text-navy shadow-[0_2px_20px_rgba(19,36,73,0.06)]"
                }`}
              >
                {t.featured ? <div className="spectrum-animated absolute inset-x-0 top-0 h-1.5" /> : null}
                <div className={`text-[11px] font-extrabold tracking-[0.14em] uppercase ${t.featured ? "text-gold-bright" : "text-muted"}`}>{t.step}</div>
                <h3 className="mt-3 font-serif text-[24px] leading-tight font-semibold">{t.name}</h3>
                <div
                  className={`mt-2 font-serif font-semibold ${t.featured ? "text-gold-bright" : "text-gold-deep"} ${
                    t.price.length > 6 ? "text-[17px] leading-snug" : "text-[30px]"
                  }`}
                >
                  {t.price}
                </div>
                <p className={`mt-3 text-[14px] leading-[1.6] ${t.featured ? "text-white/80" : "text-body"}`}>{t.desc}</p>
                <ul className="mt-5 mb-7 flex list-none flex-col gap-2 p-0">
                  {t.items.map((item) => (
                    <li key={item} className={`flex gap-2 text-[13.5px] leading-[1.5] ${t.featured ? "text-white/85" : "text-body"}`}>
                      <span className={`mt-[7px] h-1.5 w-1.5 flex-none rounded-full ${t.featured ? "bg-gold-bright" : "bg-gold"}`} />
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href={t.href}
                  {...(external(t.href) ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className={`mt-auto inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-[14px] font-extrabold transition ${
                    t.featured ? "bg-gold text-navy-deep hover:bg-gold-bright" : "border-[1.5px] border-navy text-navy hover:bg-navy hover:text-white"
                  }`}
                >
                  {t.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final call ──────────────────────────────────────────────────── */}
      <section className="aurora text-white">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-5 py-20 text-center sm:px-8">
          <p className="text-[11px] font-extrabold tracking-[0.2em] text-gold-bright uppercase">Start free</p>
          <h2 className="mt-4 font-serif text-[40px] leading-[1.1] font-semibold sm:text-[52px]">Find your peak hours this week</h2>
          <p className="mt-5 max-w-2xl text-[16px] leading-[1.7] text-white/75">
            Five to seven days of tracking, one tap an hour. Then we meet, and you leave with a Peak Plan you can drop straight into your calendar.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="inline-flex min-h-13 items-center rounded-2xl bg-gold px-7 text-[15px] font-extrabold text-navy-deep transition hover:-translate-y-0.5 hover:bg-gold-bright">
              Start the Charge Index
            </Link>
            <a href={BOOK_CALL_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-13 items-center rounded-2xl border-[1.5px] border-white/30 px-6 text-[14.5px] font-extrabold text-white transition hover:bg-white/10">
              Book a call with Jen
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
