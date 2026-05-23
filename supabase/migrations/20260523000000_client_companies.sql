-- Recruiters Portal (Sprint P2-1) — client_companies + jobs.client_company_id
--
-- Agency-private labeling table. Each agency keeps its own list of end-client
-- companies it posts roles for. Same company name across two agencies = two
-- unrelated rows (e.g. Agency X's "Acme" and Agency Y's "Acme" never see
-- each other).
--
-- This is NOT a copy of employers — direct-client employers post for
-- themselves and ignore this table entirely (jobs.client_company_id stays
-- null for them). See docs/ec-admin-recruiters-plan.md.

create table client_companies (
  id uuid primary key default gen_random_uuid(),
  agency_employer_id uuid not null references employers(id) on delete cascade,
  name text not null,
  contact_name text,
  contact_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agency_employer_id, name)
);

create index client_companies_agency_idx on client_companies(agency_employer_id);

alter table jobs
  add column client_company_id uuid references client_companies(id) on delete set null;

create index jobs_client_company_idx on jobs(client_company_id) where client_company_id is not null;

-- RLS: each agency only sees its own client_companies rows. Lauren sees all.
alter table client_companies enable row level security;

create policy client_companies_self on client_companies for all to authenticated
  using (is_employer() and agency_employer_id = current_employer_id())
  with check (is_employer() and agency_employer_id = current_employer_id());

create policy client_companies_admin on client_companies for all to authenticated
  using (is_admin())
  with check (is_admin());
