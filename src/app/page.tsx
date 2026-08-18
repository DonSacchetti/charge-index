const SCALE = [
  { pct: "100%", label: "Fully Charged", color: "bg-level-100" },
  { pct: "75%", label: "Positively Charged", color: "bg-level-75" },
  { pct: "50%", label: "Steady Charge", color: "bg-level-50" },
  { pct: "25%", label: "Low Charge", color: "bg-level-25" },
  { pct: "10%", label: "Recharge Needed", color: "bg-level-10" },
];

export default function Home() {
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
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-20">
        <p className="text-[11px] font-extrabold tracking-[0.2em] text-gold-deep uppercase">
          Charge Index™ · foundations deploying
        </p>
        <h1 className="mt-5 font-serif text-5xl leading-tight font-semibold text-navy sm:text-6xl">
          How charged
          <br />
          are you?
        </h1>
        <div className="mt-6 h-0.5 w-14 bg-gold" />
        <p className="mt-6 max-w-md text-base leading-relaxed text-body">
          The Charge Index tracker and The Peak Plan are being built here. This
          page confirms the deploy pipeline is live — the real client
          experience lands in the next phase.
        </p>

        <div className="mt-12 grid grid-cols-5 gap-2">
          {SCALE.map((s) => (
            <div key={s.pct} className="overflow-hidden rounded-xl border border-line bg-white">
              <div className={`h-1.5 ${s.color}`} />
              <div className="px-3 py-4">
                <div className="font-serif text-xl font-semibold text-navy">{s.pct}</div>
                <div className="mt-1 text-[10px] leading-tight font-bold text-muted">
                  {s.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
