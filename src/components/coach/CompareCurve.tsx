import { scaleOf } from "@/lib/charge";
import { ZONE_BANDS } from "@/lib/chart";
import { formatHour } from "@/lib/slots";

export type CompareSeries = {
  id: string;
  label: string;
  startDate: string;
  values: (number | null)[];
  current: boolean;
};

const W = 760;
const H = 300;
const M = { top: 16, right: 24, bottom: 34, left: 46 };
const PLOT_W = W - M.left - M.right;
const PLOT_H = H - M.top - M.bottom;
const y = (v: number) => M.top + (1 - v / 100) * PLOT_H;

/**
 * Colour plus dash pattern per series, so lines stay distinguishable for
 * colour-blind readers and in black-and-white print. The session being viewed
 * is always the solid navy line.
 */
const CURRENT_STYLE = { color: "#132449", dash: undefined, width: 3 };
const OTHER_STYLES = [
  { color: "#a8844a", dash: "7 5", width: 2.25 },
  { color: "#3a6ec4", dash: "2 4", width: 2.25 },
  { color: "#8a8aa0", dash: "10 4 2 4", width: 2.25 },
];

export function styleFor(series: CompareSeries[], index: number) {
  if (series[index].current) return CURRENT_STYLE;
  const otherIndex = series.slice(0, index).filter((s) => !s.current).length;
  return OTHER_STYLES[otherIndex % OTHER_STYLES.length];
}

/** Several sessions' average charge curves overlaid on one shared hour axis. */
export function CompareCurve({ axis, series }: { axis: number[]; series: CompareSeries[] }) {
  const step = axis.length ? PLOT_W / axis.length : PLOT_W;
  const x = (i: number) => M.left + (i + 0.5) * step;

  const pathFor = (values: (number | null)[]) => {
    const parts: string[] = [];
    let open = false;
    values.forEach((v, i) => {
      if (v === null) {
        open = false;
        return;
      }
      parts.push(`${open ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`);
      open = true;
    });
    return parts.join(" ");
  };

  return (
    <figure className="m-0">
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full min-w-[620px]"
          role="img"
          aria-label={`Average charge by hour for ${series.length} sessions: ${series.map((s) => s.label).join(", ")}.`}
        >
          {ZONE_BANDS.map((b) => (
            <rect
              key={b.value}
              x={M.left}
              y={y(b.to)}
              width={PLOT_W}
              height={y(b.from) - y(b.to)}
              fill={scaleOf(b.value).tint}
              opacity={0.7}
            />
          ))}
          {[0, 25, 50, 75, 100].map((v) => (
            <g key={v}>
              <line x1={M.left} x2={M.left + PLOT_W} y1={y(v)} y2={y(v)} stroke="#132449" strokeOpacity={0.08} />
              <text x={M.left - 8} y={y(v)} textAnchor="end" dominantBaseline="middle" fontSize={10.5} fill="#8a8aa0">
                {v}%
              </text>
            </g>
          ))}

          {/* Others first, so the current session draws on top. */}
          {series
            .map((s, i) => ({ s, i }))
            .sort((a, b) => Number(a.s.current) - Number(b.s.current))
            .map(({ s, i }) => {
              const st = styleFor(series, i);
              return (
                <g key={s.id}>
                  <title>{`${s.label} (from ${s.startDate})`}</title>
                  <path
                    d={pathFor(s.values)}
                    fill="none"
                    stroke={st.color}
                    strokeWidth={st.width}
                    strokeDasharray={st.dash}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  {s.values.map((v, j) =>
                    v === null ? null : (
                      <circle key={j} cx={x(j)} cy={y(v)} r={s.current ? 3.5 : 2.5} fill={st.color}>
                        <title>{`${s.label} · ${formatHour(axis[j])} — ${v}%`}</title>
                      </circle>
                    ),
                  )}
                </g>
              );
            })}

          {axis.map((h, i) => (
            <text
              key={h}
              x={x(i)}
              y={M.top + PLOT_H + 18}
              textAnchor="middle"
              fontSize={axis.length > 16 ? 9 : 10}
              fontWeight={700}
              fill="#132449"
            >
              {formatHour(h)}
            </text>
          ))}
        </svg>
      </div>

      <figcaption className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[11.5px] text-body">
        {series.map((s, i) => {
          const st = styleFor(series, i);
          return (
            <span key={s.id} className="flex items-center gap-2">
              <svg width="28" height="8" aria-hidden>
                <line x1="1" x2="27" y1="4" y2="4" stroke={st.color} strokeWidth={st.width} strokeDasharray={st.dash} strokeLinecap="round" />
              </svg>
              <span className={s.current ? "font-extrabold text-navy" : ""}>
                {s.label}
                {s.current ? " (this session)" : ""}
              </span>
              <span className="text-muted">from {s.startDate}</span>
            </span>
          );
        })}
      </figcaption>
    </figure>
  );
}
