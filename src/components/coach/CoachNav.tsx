"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/coach", label: "Clients", match: (p: string) => p === "/coach" || p.startsWith("/coach/clients") },
  { href: "/coach/sessions", label: "All sessions", match: (p: string) => p.startsWith("/coach/sessions") },
];

/** Admin-area navigation. "Client view" goes to the same screens a client uses. */
export function CoachNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Coach" className="flex flex-wrap items-center gap-1">
      {LINKS.map((l) => {
        const active = l.match(pathname);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`inline-flex min-h-10 items-center rounded-full px-3.5 text-[13px] font-extrabold transition ${
              active ? "bg-white text-navy shadow-[0_6px_20px_-8px_rgba(255,255,255,0.6)]" : "text-white/80 hover:bg-white/10 hover:text-white"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      <Link
        href="/setup"
        className="inline-flex min-h-10 items-center rounded-full px-3.5 text-[13px] font-bold text-white/60 hover:bg-white/10 hover:text-white"
      >
        Client view
      </Link>
    </nav>
  );
}
