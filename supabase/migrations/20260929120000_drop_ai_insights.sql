-- Charge Index — remove the AI insight drafts
--
-- Jen, in review with Josh on 2026-09-29: she'll write the analysis herself
-- and doesn't want an AI draft anywhere in the product. The feature was built
-- in Phase 9 and never switched on — no Anthropic account was ever created,
-- so this table has never held a real row.
--
-- This also retires the ANTHROPIC_API_KEY dependency: nothing in the app
-- calls a model any more.
drop table if exists public.ai_insights;
