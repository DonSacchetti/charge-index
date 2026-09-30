import Link from "next/link";

import { Card, CoachShell } from "@/components/CoachShell";
import { NewCompanyForm } from "@/components/coach/CompanyForms";
import { loadCompanies } from "@/lib/teams";
import { requireCoach } from "@/lib/viewer";

/**
 * Jen's corporate list, kept separate from her individual clients (her call,
 * 2026-09-29). A company has teams; a team runs rounds; a round produces the
 * team Peak Plan only the lead sees.
 */
export default async function CompaniesPage({ searchParams }: PageProps<"/coach/companies">) {
  const { supabase } = await requireCoach("/coach/companies");
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().toLowerCase() : "";

  const all = await loadCompanies(supabase);
  const companies = query
    ? all.filter(
        (c) => c.name.toLowerCase().includes(query) || c.teams.some((t) => t.name.toLowerCase().includes(query)),
      )
    : all;

  const totals = {
    companies: all.length,
    teams: all.reduce((n, c) => n + c.teams.length, 0),
    people: all.reduce((n, c) => n + c.teams.reduce((m, t) => m + t.members.length, 0), 0),
    tracking: all.reduce(
      (n, c) => n + c.teams.filter((t) => t.rounds.some((r) => r.status === "tracking")).length,
      0,
    ),
  };

  return (
    <CoachShell>
      <div className="aurora animate-rise mb-6 rounded-[28px] px-6 py-8 text-white shadow-[0_30px_70px_-35px_rgba(19,36,73,0.8)] sm:px-9">
        <div className="text-[11px] font-extrabold tracking-[0.2em] text-gold-bright uppercase">Coach view · not visible to clients</div>
        <h1 className="mt-2 font-serif text-[40px] leading-tight font-semibold">Companies</h1>
        <dl className="m-0 mt-7 grid grid-cols-3 gap-3">
          {[
            { label: totals.companies === 1 ? "company" : "companies", value: totals.companies, level: 75 },
            { label: totals.teams === 1 ? "team" : "teams", value: totals.teams, level: 100 },
            { label: "people joined", value: totals.people, level: 25 },
          ].map((s, i) => (
            <div
              key={s.label}
              className="animate-rise rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-4 backdrop-blur"
              style={{ animationDelay: `${120 + i * 70}ms` }}
            >
              <dd className="m-0 font-serif text-[34px] leading-none font-semibold" style={{ color: `var(--color-glow-${s.level})` }}>
                {s.value}
              </dd>
              <dt className="mt-2 text-[12px] font-bold text-white/70">{s.label}</dt>
            </div>
          ))}
        </dl>
        {totals.tracking ? (
          <p className="mt-4 text-[12.5px] text-white/70">
            {totals.tracking} {totals.tracking === 1 ? "team is" : "teams are"} tracking right now.
          </p>
        ) : null}
      </div>

      {all.length > 3 ? (
        <form className="mb-4 flex gap-2" role="search">
          <label htmlFor="company-search" className="sr-only">
            Search companies
          </label>
          <input
            id="company-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search by company or team"
            className="w-full max-w-sm rounded-2xl border-[1.5px] border-line bg-white px-4 py-3 text-[14px] text-ink outline-none transition focus:border-gold focus:ring-4 focus:ring-gold/20"
          />
          <button type="submit" className="rounded-2xl bg-navy px-5 text-[13.5px] font-extrabold text-white transition hover:bg-navy-light">
            Search
          </button>
        </form>
      ) : null}

      <Card className="mb-5" accent="gold">
        <h2 className="mb-1 font-serif text-[20px] font-semibold text-navy">Add a company</h2>
        <p className="mb-4 text-[12.5px] leading-[1.6] text-muted">
          You create the company and its teams, then send the team lead their link. Seats stay closed until you open them —
          that&rsquo;s how a team waits for payment without anything automatic being involved.
        </p>
        <NewCompanyForm />
      </Card>

      {companies.length === 0 ? (
        <Card>
          <p className="m-0 text-[13.5px] text-body">
            {query ? `No companies match “${query}”.` : "No companies yet. Add one above to get started."}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {companies.map((company) => {
            const people = company.teams.reduce((n, t) => n + t.members.length, 0);
            const seats = company.teams.reduce((n, t) => n + t.seats, 0);
            return (
              <Card key={company.id} accent="spectrum">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="font-serif text-[22px] font-semibold text-navy">
                    <Link href={`/coach/companies/${company.id}`} className="underline">
                      {company.name}
                    </Link>
                  </h2>
                  <span className="text-[12px] font-bold text-muted">
                    {company.teams.length} {company.teams.length === 1 ? "team" : "teams"} · {people} of {seats} seats taken
                  </span>
                </div>
                {company.teams.length ? (
                  <ul className="m-0 mt-3 flex list-none flex-wrap gap-2 p-0">
                    {company.teams.map((team) => {
                      const round = team.rounds.find((r) => r.status === "tracking");
                      return (
                        <li
                          key={team.id}
                          className="rounded-full border border-line px-3 py-1 text-[12px] font-bold text-body"
                          title={team.lead_id ? "Lead has claimed their link" : "Waiting for the lead to claim their link"}
                        >
                          {team.name} · {team.members.length}/{team.seats || "—"}
                          {round ? <span className="ml-1 text-level-100">· round {round.number}</span> : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="m-0 mt-3 text-[12.5px] text-muted">No teams yet.</p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </CoachShell>
  );
}
