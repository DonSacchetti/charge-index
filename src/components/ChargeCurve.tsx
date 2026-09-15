import { nearestTier, scaleOf } from "@/lib/charge";
import { ZONE_BANDS } from "@/lib/chart";
import { formatHour } from "@/lib/slots";
import type { HourAverage, Windows } from "@/lib/weekly-map";

type Props = {
  map: HourAverage[];
  windows: Windows;
  /** Days in the session — an hour answered on fewer days is "partial". */
  dayCount: number;
};

const W = 760;
const H = 330;
const M = { top: 16, right: 118, bottom: 46, left: 46 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;

const NAVY = "#132449";
const MUTED = "#8a8aa0";

const WINDOW_STYLE = {
  peak: { color: "#2f7d52", label: "Peak" },
  collaboration: { color: "#3a6ec4", label: "Collaboration" },
  recovery: { color: "#c04545", label: "Recovery" },
} as const;

const y = (v: number) => M.top + (1 - v / 100) * PLOT_H;

/**
 * The coach's charge curve: average charge per waking hour across a session,
 * drawn as server-rendered SVG so it needs no client JS and prints cleanly.
 *
 * - Filled dot: the hour was answered on every day of the session.
 * - Hollow ring with "n=": answered on only some days — the average stands on
 *   thinner evidence, and the coach should see that.
 * - Gap in the line: nobody answered that hour on any day. There is no
 *   average to draw, so the line doesn't invent one across it.
 */
export function ChargeCurve({ map, windows, dayCount }: Props) {
  const n = map.length;
  const step = n ? PLOT_W / n : PLOT_W;
  const x = (i: number) => M.left + (i + 0.5) * step;

  // Line segments, broken wherever an hour has no data.
  const segments: string[] = [];
  let current: string[] = [];
  map.forEach((m, i) => {
    if (m.avgPct === null) {
      if (current.length) segments.push(current.join(" "));
      current = [];
    } else {
      current.push(`${current.length ? "L" : "M"}${x(i).toFixed(1)},${y(m.avgPct).toFixed(1)}`);
    }
  });
  if (current.length) segments.push(current.join(" "));

  const indexOf = new Map(map.map((m, i) => [m.hour, i]));
  const answered = map.filter((m) => m.avgPct !== null).length;

  const summary =
    answered === 0
      ? "No hours logged yet."
      : `Average charge for ${answered} of ${n} waking hours. ` +
        (Object.keys(WINDOW_STYLE) as (keyof Windows)[])
          .map((band) => {
            const run = windows[band];
            return run.length
              ? `${WINDOW_STYLE[band].label} window ${formatHour(run[0])} to ${formatHour((run[run.length - 1] + 1) % 24)}.`
              : `No ${WINDOW_STYLE[band].label.toLowerCase()} window.`;
          })
          .join(" ");

  return (
    <figure className="m-0">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full min-w-[620px]"
          role="img"
          aria-labelledby="curve-title curve-desc"
        >
          <title id="curve-title">Charge curve</title>
          <desc id="curve-desc">{summary}</desc>

          {/* Zone shading */}
          {ZONE_BANDS.map((b) => {
            const s = scaleOf(b.value);
            return (
              <g key={b.value}>
                <rect
                  x={M.left}
                  y={y(b.to)}
                  width={PLOT_W}
                  height={y(b.from) - y(b.to)}
                  fill={s.tint}
                />
                <text
                  x={M.left + PLOT_W + 10}
                  y={(y(b.from) + y(b.to)) / 2}
                  dominantBaseline="middle"
                  fontSize={10.5}
                  fontWeight={800}
                  fill={s.color}
                >
                  {s.short}
                </text>
              </g>
            );
          })}

          {/* Gridlines + y axis */}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line
                x1={M.left}
                x2={M.left + PLOT_W}
                y1={y(v)}
                y2={y(v)}
                stroke="#132449"
                strokeOpacity={0.08}
              />
              <text
                x={M.left - 8}
                y={y(v)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={10.5}
                fill={MUTED}
              >
                {v}%
              </text>
            </g>
          ))}

          {/* The curve */}
          {segments.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke={NAVY}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ))}

          {/* Points */}
          {map.map((m, i) => {
            if (m.avgPct === null) return null;
            const tier = scaleOf(nearestTier(m.avgPct));
            const partial = m.daysAnswered < dayCount;
            const cy = y(m.avgPct);
            const noteBelow = m.avgPct > 14;
            return (
              <g key={m.hour}>
                <title>
                  {`${formatHour(m.hour)} — ${m.avgPct}% average (${tier.short}), answered on ${m.daysAnswered} of ${dayCount} days`}
                </title>
                <circle
                  cx={x(i)}
                  cy={cy}
                  r={5.5}
                  fill={partial ? "#fff" : tier.color}
                  stroke={partial ? tier.color : "#fff"}
                  strokeWidth={partial ? 2.5 : 2}
                />
                {partial ? (
                  <text
                    x={x(i)}
                    y={noteBelow ? cy + 17 : cy - 11}
                    textAnchor="middle"
                    fontSize={9}
                    fontWeight={700}
                    fill={MUTED}
                    // White halo so the curve can't run through the label.
                    stroke="#fff"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    n={m.daysAnswered}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* X axis labels — muted where the hour has no data */}
          {map.map((m, i) => (
            <text
              key={m.hour}
              x={x(i)}
              y={M.top + PLOT_H + 16}
              textAnchor="middle"
              fontSize={n > 16 ? 9 : 10}
              fontWeight={700}
              fill={m.avgPct === null ? "#c8c7d2" : NAVY}
            >
              {formatHour(m.hour)}
            </text>
          ))}

          {/* Window markers under the axis. One row: the bands are disjoint, so
              an hour's average can sit in at most one window. */}
          {(Object.keys(WINDOW_STYLE) as (keyof Windows)[]).map((band) => {
            const run = windows[band];
            if (!run.length) return null;
            const first = indexOf.get(run[0])!;
            const last = indexOf.get(run[run.length - 1])!;
            return (
              <rect
                key={band}
                x={x(first) - step / 2 + 2}
                y={M.top + PLOT_H + 30}
                width={(last - first + 1) * step - 4}
                height={6}
                rx={3}
                fill={WINDOW_STYLE[band].color}
              >
                <title>{`${WINDOW_STYLE[band].label} window`}</title>
              </rect>
            );
          })}
        </svg>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11.5px] text-body">
        <span className="flex items-center gap-[6px]">
          <span className="inline-block h-[11px] w-[11px] rounded-full border-2 border-white bg-navy shadow-[0_0_0_1px_#132449]" />
          Answered every day
        </span>
        <span className="flex items-center gap-[6px]">
          <span className="inline-block h-[11px] w-[11px] rounded-full border-[2.5px] border-navy bg-white" />
          Some days only (n = days answered)
        </span>
        {(Object.keys(WINDOW_STYLE) as (keyof Windows)[]).map((band) => (
          <span key={band} className="flex items-center gap-[6px]">
            <span
              className="inline-block h-[6px] w-5 rounded-full"
              style={{ background: WINDOW_STYLE[band].color }}
            />
            {WINDOW_STYLE[band].label} window
          </span>
        ))}
      </figcaption>

      <details className="mt-3 text-[12px] text-body">
        <summary className="cursor-pointer font-bold text-navy">View the numbers</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line text-[10px] font-extrabold tracking-[0.08em] text-muted uppercase">
                <th className="py-2 pr-3">Hour</th>
                <th className="py-2 pr-3">Average</th>
                <th className="py-2 pr-3">Nearest level</th>
                <th className="py-2">Days answered</th>
              </tr>
            </thead>
            <tbody>
              {map.map((m) => (
                <tr key={m.hour} className="border-b border-[#f0efea]">
                  <td className="py-[6px] pr-3 font-bold text-navy">{formatHour(m.hour)}</td>
                  <td className="py-[6px] pr-3">{m.avgPct === null ? "—" : `${m.avgPct}%`}</td>
                  <td className="py-[6px] pr-3">
                    {m.avgPct === null ? "—" : scaleOf(nearestTier(m.avgPct)).short}
                  </td>
                  <td className="py-[6px]">
                    {m.daysAnswered} of {dayCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
