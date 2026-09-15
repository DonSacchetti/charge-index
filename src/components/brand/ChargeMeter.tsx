import { nearestTier, scaleOf } from "@/lib/charge";

type Props = {
  /** Values 0–100, one bar each. */
  values: number[];
  /** Bar area height in px. */
  height?: number;
  gap?: number;
  /** Gently breathe after rising. Off for static readouts. */
  alive?: boolean;
  className?: string;
  labels?: string[];
};

/**
 * The signature element: bars that rise to their charge and breathe, each
 * coloured by its nearest level. Decorative unless labels are given.
 */
export function ChargeMeter({ values, height = 120, gap = 5, alive = true, className = "", labels }: Props) {
  return (
    <div className={className} aria-hidden={labels ? undefined : true}>
      <div className="flex items-end" style={{ height, gap }}>
        {values.map((v, i) => {
          const s = scaleOf(nearestTier(v));
          return (
            <div key={i} className="flex h-full flex-1 items-end">
              <div
                className="w-full origin-bottom rounded-t-[5px] rounded-b-[2px]"
                style={{
                  height: `${Math.max(6, v)}%`,
                  background: `linear-gradient(180deg, var(--color-glow-${s.value}), ${s.color})`,
                  boxShadow: `0 0 18px -4px var(--color-glow-${s.value})`,
                  animation: `charge-rise 0.9s cubic-bezier(.2,.8,.2,1) ${i * 55}ms both${
                    alive ? `, breathe ${3.2 + (i % 4) * 0.5}s ease-in-out ${900 + i * 55}ms infinite` : ""
                  }`,
                }}
                title={labels ? `${labels[i]}: ${Math.round(v)}%` : undefined}
              />
            </div>
          );
        })}
      </div>
      {labels ? (
        <div className="mt-2 flex" style={{ gap }}>
          {labels.map((l, i) => (
            <div key={i} className="flex-1 text-center text-[10px] font-bold text-current opacity-70">
              {l}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
