import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

export const BOOK_CALL_URL = "https://calendly.com/d/yry-kfz-7b3/initial-consultation-call";

/** Public header for signed-out pages: landing, sign in, sign up. */
export function SiteHeader({ tone = "light", sections = false }: { tone?: "light" | "dark"; sections?: boolean }) {
  const light = tone === "light";
  return (
    <header className={`relative z-20 ${light ? "text-white" : "text-navy"}`}>
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:gap-6 sm:px-8">
        <Logo tone={light ? "light" : "dark"} />
        {sections ? (
          <nav aria-label="Sections" className="ml-6 hidden items-center gap-6 text-[13px] font-bold md:flex">
            <a href="#how" className={`${light ? "text-white/75 hover:text-white" : "text-body hover:text-navy"}`}>How it works</a>
            <a href="#scale" className={`${light ? "text-white/75 hover:text-white" : "text-body hover:text-navy"}`}>The scale</a>
            <a href="#plans" className={`${light ? "text-white/75 hover:text-white" : "text-body hover:text-navy"}`}>Plans</a>
            <a href={BOOK_CALL_URL} target="_blank" rel="noopener noreferrer" className={`${light ? "text-white/75 hover:text-white" : "text-body hover:text-navy"}`}>Book a call</a>
          </nav>
        ) : null}
        <div className="ml-auto flex flex-none items-center gap-1 sm:gap-2">
          <Link
            href="/login"
            className={`inline-flex min-h-10 items-center rounded-full px-3 text-[13px] font-extrabold whitespace-nowrap sm:px-4 ${light ? "text-white hover:bg-white/10" : "text-navy hover:bg-navy/6"}`}
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-10 items-center rounded-full bg-gold px-4 text-[13px] font-extrabold whitespace-nowrap text-navy-deep shadow-[0_6px_20px_-6px_rgba(201,169,110,0.7)] transition hover:bg-gold-bright"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-navy-deep text-white/60">
      <div className="spectrum h-[3px]" />
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-[12px] sm:px-8">
        <span>Soenen Strategies® · Jen Soenen, Time Strategist</span>
        <span className="flex flex-wrap gap-4">
          <a href="mailto:soenenstrategies@gmail.com" className="hover:text-white">soenenstrategies@gmail.com</a>
          <a href={BOOK_CALL_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white">Book a call</a>
        </span>
      </div>
    </footer>
  );
}
