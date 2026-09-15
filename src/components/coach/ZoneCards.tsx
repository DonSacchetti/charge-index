import { ZONE_CARDS, type ZoneCardKey, formatTopHours } from "@/lib/coach-analysis";

/** The prototype's four zone cards: the hours that most often landed in each zone. */
export function ZoneCards({ top }: { top: Record<ZoneCardKey, number[]> }) {
  return (
    <div className="grid gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
      {ZONE_CARDS.map((z) => (
        <div
          key={z.key}
          className="rounded-[16px] border-[1.5px] px-4 py-[18px] text-center"
          style={{ borderColor: z.color, background: z.tint }}
        >
          <div className="mb-[9px] text-[9.5px] font-extrabold tracking-[0.11em] uppercase" style={{ color: z.color }}>
            {z.name}
          </div>
          <div className="min-h-[66px] font-serif text-[15px] leading-normal font-semibold text-ink">
            {formatTopHours(top[z.key])}
          </div>
          <div className="mt-[6px] text-[11px] leading-normal text-muted">{z.desc}</div>
        </div>
      ))}
    </div>
  );
}
