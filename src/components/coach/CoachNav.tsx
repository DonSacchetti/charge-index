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
            className={`inline-flex min-h-10 items-center rounded-[9px] px-3 text-[12.5px] font-extrabold ${
              active ? "bg-navy text-white" : "text-navy hover:bg-navy/8"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
      <Link
        href="/setup"
        className="inline-flex min-h-10 items-center rounded-[9px] px-3 text-[12.5px] font-bold text-muted hover:bg-navy/8 hover:text-navy"
      >
        Client view
      </Link>
    </nav>
  );
}
