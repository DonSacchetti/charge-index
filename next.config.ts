import type { NextConfig } from "next";

/**
 * Security headers, added 2026-10-07 after a review found the app sent none.
 *
 * Vercel already sets Strict-Transport-Security on the custom domain, so it
 * isn't repeated here. A Content-Security-Policy is deliberately NOT set yet:
 * it needs care around Next.js's inline bootstrap scripts, Cloudflare
 * Turnstile's iframe and Google Fonts, and a careless one breaks the app
 * silently in some browsers. That's its own piece of work.
 */
const securityHeaders = [
  {
    // Clickjacking. Nothing embeds this app, so refuse framing outright: a
    // signed-in client can't be tricked into clicking an invisible copy of
    // their own log, and once checkout exists, neither can they be tricked
    // into clicking Buy. This governs the app being framed by others — it
    // does not affect the Turnstile iframe rendered inside our own pages.
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Session and plan URLs carry a session UUID in the path. This sends only
    // the origin to another site, never the path, so clicking through to
    // Calendly from a results page can't hand over the session id. The links
    // themselves already carry rel="noreferrer"; this covers everything else.
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Stop browsers second-guessing the declared Content-Type. Matters most
    // for the CSV and .ics downloads, which hold client-typed text and should
    // never be re-interpreted as HTML.
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // The app asks for none of these. Denying them means an injected script or
    // an embedded third party can't quietly request them either.
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
