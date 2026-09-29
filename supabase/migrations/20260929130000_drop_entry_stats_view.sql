-- Charge Index — retire session_entry_stats
--
-- It existed to count "how many of this client's hours are 100%" for the old
-- flat-100% flag. Jen replaced that rule on 2026-09-29 with "five straight
-- hours on one level, two days running", which needs the shape of each day
-- rather than totals, so the roster reads the entries themselves and runs the
-- same function the session pages use.
drop view if exists public.session_entry_stats;
