"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

type Job = () => Promise<void>;

/**
 * Serialises writes per key, keeping only the latest one.
 *
 * Tapping 75% then 100% on the same hour fires two writes. Without this, the
 * second can land first and the database ends up on 75% while the screen shows
 * 100%. Here each key runs one write at a time, and anything queued behind it
 * collapses to the most recent value — so the last tap always wins.
 *
 * A failed write is kept, not dropped: status goes to "error" and the job is
 * retried on `retry()` or when the browser comes back online.
 */
export function useSaveQueue() {
  const pending = useRef(new Map<string, Job>());
  const running = useRef(new Set<string>());
  const failed = useRef(new Map<string, Job>());
  const [status, setStatus] = useState<SaveStatus>("idle");
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refreshStatus = useCallback(() => {
    clearTimeout(savedTimer.current);
    if (failed.current.size > 0) {
      setStatus("error");
    } else if (running.current.size > 0 || pending.current.size > 0) {
      setStatus("saving");
    } else {
      setStatus("saved");
      savedTimer.current = setTimeout(() => setStatus("idle"), 1800);
    }
  }, []);

  const pump = useCallback(
    async (key: string) => {
      if (running.current.has(key)) return;
      running.current.add(key);

      // Drain this key: each pass sends the newest queued write, and any
      // write queued while one was in flight is picked up on the next pass.
      let job = pending.current.get(key);
      while (job) {
        pending.current.delete(key);
        refreshStatus();
        try {
          await job();
          failed.current.delete(key);
        } catch {
          // A newer write for this key supersedes the failed one.
          if (!pending.current.has(key)) failed.current.set(key, job);
        }
        job = pending.current.get(key);
      }

      running.current.delete(key);
      refreshStatus();
    },
    [refreshStatus],
  );

  const enqueue = useCallback(
    (key: string, job: Job) => {
      failed.current.delete(key);
      pending.current.set(key, job);
      void pump(key);
    },
    [pump],
  );

  const retry = useCallback(() => {
    const jobs = [...failed.current.entries()];
    failed.current.clear();
    for (const [key, job] of jobs) enqueue(key, job);
    if (jobs.length === 0) refreshStatus();
  }, [enqueue, refreshStatus]);

  useEffect(() => {
    window.addEventListener("online", retry);
    return () => {
      window.removeEventListener("online", retry);
      clearTimeout(savedTimer.current);
    };
  }, [retry]);

  return { status, enqueue, retry };
}
