import { ZONE_CARDS, type ZoneCardKey } from "@/lib/coach-analysis";
import { formatRanges } from "@/lib/weekly-map";

/**
 * The four zones of the client's ideal day, as ranges.
 *
 * Jen, 2026-09-29: read like the window cards, and follow the ideal day rather
 * than a count of raw entries. Josh, same day: the client's own Peak Plan
 * shows these four as well, so they render on a printable page — hence the
 * print rules and a layout that runs along the card rather than down it.
 */
export function ZoneCards({ hours }: { hours: Record<ZoneCardKey, number[]> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
      {ZONE_CARDS.map((z) => (
        <div
          key={z.key}
          className="relative overflow-hidden rounded-[16px] border-[1.5px] py-3 pr-4 pl-5 print:break-inside-avoid print:[-webkit-print-color-adjust:exact] print:[print-color-adjust:exact]"
          style={{ borderColor: z.color, background: z.tint }}
        >
          <div className="absolute inset-y-0 left-0 w-1.5" style={{ background: z.color }} />
          <div className="text-[9.5px] font-extrabold tracking-[0.13em] uppercase" style={{ color: z.color }}>
            {z.name}
          </div>
          <div className="font-serif text-[17px] leading-[1.2] font-semibold text-ink">{formatRanges(hours[z.key])}</div>
          <p className="mt-0.5 text-[11px] leading-[1.4] text-muted">{z.desc}</p>
        </div>
      ))}
    </div>
  );
}
