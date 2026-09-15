#!/usr/bin/env node
/**
 * Apply one migration file to the live Supabase project.
 *
 * Runs the SQL and records it in supabase_migrations.schema_migrations in a
 * single transaction, so the migration and its history row land together or
 * not at all. Skips a version that's already recorded.
 *
 *   node --env-file=../.env.local scripts/apply-migration.mjs supabase/migrations/<version>_<name>.sql
 *
 * Needs SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF (the control-plane
 * credentials in ../.env.local). Uses the Management API's SQL endpoint,
 * which works where the Supabase MCP connection hasn't.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const file = process.argv[2];
const match = file && basename(file).match(/^(\d{14})_([a-z0-9_]+)\.sql$/);
if (!match) {
  console.error("Usage: apply-migration.mjs supabase/migrations/<14-digit version>_<name>.sql");
  process.exit(2);
}
const [, version, name] = match;
const { SUPABASE_ACCESS_TOKEN: token, SUPABASE_PROJECT_REF: ref } = process.env;
if (!token || !ref) {
  console.error("Missing SUPABASE_ACCESS_TOKEN / SUPABASE_PROJECT_REF — run with --env-file=../.env.local");
  process.exit(2);
}

const sql = readFileSync(file, "utf8");
if (sql.includes("$migration$")) {
  console.error("Migration text contains the $migration$ quote tag; pick another tag in this script.");
  process.exit(2);
}

async function query(text) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: text }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

const existing = await query(`select 1 from supabase_migrations.schema_migrations where version = '${version}'`);
if (existing.length) {
  console.log(`Already applied: ${version}_${name}`);
  process.exit(0);
}

await query(
  `begin;\n${sql}\n` +
    `insert into supabase_migrations.schema_migrations (version, name, statements) ` +
    `values ('${version}', '${name}', array[$migration$${sql}$migration$]);\ncommit;`,
);
console.log(`Applied ${version}_${name}`);
