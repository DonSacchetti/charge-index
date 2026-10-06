"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Cloudflare Turnstile — the bot check on signup and login.
 *
 * It renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so the forms
 * behave exactly as before until the key exists (Josh, 2026-10-06: built ahead
 * of the handover so switching it on is two keys, not a code change).
 *
 * The matching secret goes in Supabase's own auth settings. Once Supabase has
 * a CAPTCHA enabled it demands a token on EVERY auth call — signup, login and
 * password recovery alike — which is why this sits on both forms rather than
 * just the one that attracts bots.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      reset: (id?: string) => void;
    };
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function Turnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const holder = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [token, setToken] = useState("");
  const [failed, setFailed] = useState(false);
  const fieldId = useId();

  useEffect(() => {
    if (!siteKey || !holder.current) return;

    let cancelled = false;
    const render = () => {
      if (cancelled || !holder.current || !window.turnstile || widget.current) return;
      widget.current = window.turnstile.render(holder.current, {
        sitekey: siteKey,
        theme: "light",
        callback: (value) => {
          setToken(value);
          setFailed(false);
        },
        // A token is good for a few minutes; someone who leaves the tab open
        // would otherwise submit a stale one and see a confusing error.
        "expired-callback": () => setToken(""),
        "error-callback": () => {
          setToken("");
          setFailed(true);
        },
      });
    };

    if (window.turnstile) {
      render();
    } else if (!document.querySelector(`script[src="${SCRIPT}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT;
      script.async = true;
      script.onload = render;
      script.onerror = () => setFailed(true);
      document.head.appendChild(script);
    } else {
      // Another form on this page is already loading it.
      const timer = setInterval(() => {
        if (window.turnstile) {
          clearInterval(timer);
          render();
        }
      }, 120);
      return () => clearInterval(timer);
    }

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  if (!siteKey) return null;

  return (
    <div className="my-1">
      <div ref={holder} id={fieldId} />
      <input type="hidden" name="captcha_token" value={token} />
      {failed ? (
        <p className="mt-1 text-[12px] font-bold text-level-10">
          The bot check didn&rsquo;t load. Refresh the page and try again.
        </p>
      ) : null}
    </div>
  );
}
