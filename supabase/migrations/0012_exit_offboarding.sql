-- Exit / offboarding workflow — GreytHR-parity spec §8/§15.
-- Kept lightweight against the existing employee lifecycle rather than
-- the spec's full exit_clearances/final_settlements table set: one
-- exit_cases row per resignation, walked through a small status machine
-- (pending -> approved -> cleared -> settled, or rejected), with
-- "settled" being what actually marks the employee exited.

create table exit_cases (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  resignation_date date not null default current_date,
  last_working_day date,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'cleared', 'settled', 'rejected')),
  created_at timestamptz not null default now()
);
create index idx_exit_cases_company on exit_cases(company_id);
create index idx_exit_cases_employee on exit_cases(employee_id);

alter table exit_cases enable row level security;

drop policy if exists exit_cases_select on exit_cases;
create policy exit_cases_select on exit_cases for select using (
  auth_admin_like(company_id) or employee_id = auth_current_employee_id(company_id)
);
drop policy if exists exit_cases_insert on exit_cases;
create policy exit_cases_insert on exit_cases for insert with check (
  employee_id = auth_current_employee_id(company_id)
);
drop policy if exists exit_cases_update on exit_cases;
create policy exit_cases_update on exit_cases for update using (
  auth_admin_like(company_id)
);
