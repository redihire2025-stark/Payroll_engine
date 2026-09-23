-- 0022 introduced infinite recursion: payroll_items_select's admin branch
-- queries payroll_runs, and the new payroll_runs_self_select policy queried
-- back into payroll_items — each table's RLS evaluation re-triggered the
-- other's. Fix: route the self-access checks through `security definer`
-- helper functions (same pattern as auth_has_company_role/auth_admin_like
-- in 0004_rls.sql), which run as the table owner and bypass RLS on the
-- tables they query internally, so evaluating one policy no longer
-- re-evaluates the other.

create or replace function auth_owns_employee(target_employee_id uuid) returns boolean as $$
  select exists (select 1 from employees where id = target_employee_id and auth_user_id = auth.uid());
$$ language sql stable security definer;

create or replace function auth_owns_payroll_item(target_payroll_item_id uuid) returns boolean as $$
  select exists (
    select 1 from payroll_items pi join employees e on e.id = pi.employee_id
    where pi.id = target_payroll_item_id and e.auth_user_id = auth.uid()
  );
$$ language sql stable security definer;

create or replace function auth_owns_payroll_run(target_run_id uuid) returns boolean as $$
  select exists (
    select 1 from payroll_items pi join employees e on e.id = pi.employee_id
    where pi.payroll_run_id = target_run_id and e.auth_user_id = auth.uid()
  );
$$ language sql stable security definer;

drop policy if exists payroll_items_select on payroll_items;
create policy payroll_items_select on payroll_items for select using (
  exists (
    select 1 from payroll_runs r where r.id = payroll_run_id and (
      auth_admin_like(r.company_id)
      or auth_has_company_role(r.company_id, 'payroll_admin')
      or auth_has_company_role(r.company_id, 'finance')
    )
  )
  or auth_owns_employee(employee_id)
);

drop policy if exists payroll_earnings_select on payroll_earnings;
create policy payroll_earnings_select on payroll_earnings for select using (
  exists (
    select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id
    where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin') or auth_has_company_role(r.company_id, 'finance'))
  )
  or auth_owns_payroll_item(payroll_item_id)
);

drop policy if exists payroll_deductions_select on payroll_deductions;
create policy payroll_deductions_select on payroll_deductions for select using (
  exists (
    select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id
    where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin') or auth_has_company_role(r.company_id, 'finance'))
  )
  or auth_owns_payroll_item(payroll_item_id)
);

drop policy if exists payroll_runs_self_select on payroll_runs;
create policy payroll_runs_self_select on payroll_runs for select using (
  auth_owns_payroll_run(id)
);
