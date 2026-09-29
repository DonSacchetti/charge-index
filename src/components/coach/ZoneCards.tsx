import { ZONE_CARDS, type ZoneCardKey } from "@/lib/coach-analysis";
import { formatRanges } from "@/lib/weekly-map";

/**
 * The four zones of the client's ideal day, as ranges.
 *
 * Jen, 2026-09-29: she wanted these to read like the three window cards at the
 * top of the page — the hours themselves, big enough to take in at a glance —
 * and to follow the ideal day rather than a count of raw entries.
 */
export function ZoneCards({ hours }: { hours: Record<ZoneCardKey, number[]> }) {
  return (
    <div className="grid gap-[14px] sm:grid-cols-2 lg:grid-cols-4">
      {ZONE_CARDS.map((z) => (
        <div
          key={z.key}
          className="relative overflow-hidden rounded-[20px] border-[1.5px] p-5"
          style={{ borderColor: z.color, background: z.tint }}
        >
          <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: z.color }} />
          <div className="mt-1 mb-1.5 text-[9.5px] font-extrabold tracking-[0.13em] uppercase" style={{ color: z.color }}>
            {z.name}
          </div>
          <div className="font-serif text-[19px] leading-[1.25] font-semibold text-ink">{formatRanges(hours[z.key])}</div>
          <p className="mt-2 text-[11.5px] leading-[1.5] text-muted">{z.desc}</p>
        </div>
      ))}
    </div>
  );
}
