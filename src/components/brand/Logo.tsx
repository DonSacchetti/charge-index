import Link from "next/link";

/** Wordmark with a tiny five-bar charge mark in the level colours. */
export function Logo({ href = "/", tone = "dark", sub = "Soenen Strategies" }: { href?: string; tone?: "dark" | "light"; sub?: string }) {
  const bars = [100, 75, 50, 25, 10];
  const heights = [16, 13, 10, 7, 5];
  return (
    <Link href={href} className="group inline-flex flex-none items-center gap-[10px] whitespace-nowrap" aria-label="Charge Index home">
      <span className="flex h-[18px] items-end gap-[2px]" aria-hidden>
        {bars.map((b, i) => (
          <span
            key={b}
            className="w-[4px] origin-bottom rounded-[2px] transition-transform duration-300 group-hover:scale-y-110"
            style={{ height: heights[i], background: `var(--color-glow-${b})`, animation: `charge-rise .7s cubic-bezier(.2,.8,.2,1) ${i * 70}ms both` }}
          />
        ))}
      </span>
      <span className="leading-none">
        <span className={`block font-serif text-[18px] font-semibold ${tone === "light" ? "text-white" : "text-navy"}`}>
          Charge Index<sup className="text-[9px]">™</sup>
        </span>
        <span className={`mt-[3px] block text-[9.5px] font-extrabold tracking-[0.16em] uppercase ${tone === "light" ? "text-white/55" : "text-muted"}`}>
          {sub}
        </span>
      </span>
    </Link>
  );
}
