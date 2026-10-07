"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Every "Book a call" / "Book the session" button on the site.
 *
 * Both Calendly links hardcoded during the build were dead by 2026-10-07 —
 * Calendly answers them with "This Calendly URL is not valid", which reads to a
 * visitor as a broken business rather than an unfinished one. There were eight
 * of them across four pages, including the $249 upsell on the results screen,
 * which is the worst possible place for a dead end: the client has just
 * finished tracking and is as interested as they will ever be.
 *
 * So the URLs come from the environment now, the same way the bot check does.
 * Jen pastes her real Calendly links into Vercel and redeploys; no code change,
 * no developer. Until then nothing navigates anywhere — the button explains
 * itself and hands over an email address, so someone who wants to book still
 * has a way to reach her.
 *
 *   NEXT_PUBLIC_BOOKING_URL_CALL      the free intro call
 *   NEXT_PUBLIC_BOOKING_URL_SESSION   the paid Peak Plan session
 *
 * Set one and that button starts working; the other keeps explaining itself.
 */
const URLS = {
  call: process.env.NEXT_PUBLIC_BOOKING_URL_CALL ?? "",
  session: process.env.NEXT_PUBLIC_BOOKING_URL_SESSION ?? "",
};

const CONTACT = "soenenstrategies@gmail.com";

export function BookingLink({
  kind = "call",
  className,
  children,
}: {
  kind?: "call" | "session";
  className?: string;
  children: React.ReactNode;
}) {
  const url = URLS[kind];
  // The dialog only ever renders after a click, so it is always client-side by
  // then — no mounted guard needed for the portal.
  const [open, setOpen] = useState(false);

  // A dialog that can't be dismissed with Escape is a trap on a marketing page.
  // Hold the background still too, so dismissing doesn't land you elsewhere.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>

      {/* Portalled to <body> on purpose. Several of these buttons sit inside
          elements with a CSS transform (the entrance animations), and a
          transformed ancestor becomes the containing block for position:fixed —
          which centred the dialog on that wrapper instead of the screen. Caught
          in a browser on 2026-10-07; the classes alone looked correct. */}
      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="booking-soon-title"
              className="fixed inset-0 z-50 flex items-center justify-center bg-navy-deep/60 p-5 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            >
              <div
                className="w-full max-w-sm rounded-3xl bg-white p-7 text-left shadow-[0_30px_70px_-20px_rgba(19,36,73,0.6)]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="spectrum mb-5 h-[3px] w-14 rounded-full" />
                <h2 id="booking-soon-title" className="m-0 font-serif text-[22px] leading-tight font-semibold text-navy">
                  Booking opens soon
                </h2>
                <p className="mt-3 mb-0 text-[14px] leading-[1.6] text-body">
                  Jen&rsquo;s online calendar isn&rsquo;t live yet. Email her and she&rsquo;ll find a time with you directly.
                </p>
                <a
                  href={`mailto:${CONTACT}?subject=${encodeURIComponent(
                    kind === "session" ? "Booking a Peak Plan session" : "Booking a call",
                  )}`}
                  className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-navy px-5 text-[14px] font-extrabold text-white transition hover:bg-navy-light"
                >
                  Email Jen
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-3 min-h-10 w-full text-[13px] font-bold text-muted underline hover:text-navy"
                >
                  Close
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
