-- Background job execution history — GreytHR-parity spec §28. Payroll run
-- execution, payslip generation, and the scheduled missing-punch detection
-- job all write a row here so an admin can see what ran, when, and
-- whether it failed, rather than those processes being invisible.

create table background_jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  job_type text not null,
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  payload jsonb,
  result jsonb,
  error text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create index idx_background_jobs_company on background_jobs(company_id, started_at desc);

alter table background_jobs enable row level security;

drop policy if exists background_jobs_select on background_jobs;
create policy background_jobs_select on background_jobs for select using (auth_admin_like(company_id));
drop policy if exists background_jobs_insert on background_jobs;
create policy background_jobs_insert on background_jobs for insert with check (auth_admin_like(company_id));
drop policy if exists background_jobs_update on background_jobs;
create policy background_jobs_update on background_jobs for update using (auth_admin_like(company_id));
