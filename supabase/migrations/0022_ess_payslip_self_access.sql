-- Employees could not see their own payroll breakdown: payroll_items /
-- payroll_earnings / payroll_deductions / payroll_runs SELECT policies only
-- covered admin/payroll_admin/finance roles — unlike `payslips` (the
-- generated PDF row), which already had a self-access branch. This silently
-- broke listMyPayslips() for a real employee session (RLS just returns zero
-- rows, no error) and blocks the new ESS payslip detail view from reading
-- the earnings/deductions breakdown for the employee's own payroll_item.

drop policy if exists payroll_items_select on payroll_items;
create policy payroll_items_select on payroll_items for select using (
  exists (
    select 1 from payroll_runs r where r.id = payroll_run_id and (
      auth_admin_like(r.company_id)
      or auth_has_company_role(r.company_id, 'payroll_admin')
      or auth_has_company_role(r.company_id, 'finance')
    )
  )
  or exists (select 1 from employees e where e.id = employee_id and e.auth_user_id = auth.uid())
);

drop policy if exists payroll_earnings_select on payroll_earnings;
create policy payroll_earnings_select on payroll_earnings for select using (
  exists (
    select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id
    where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin') or auth_has_company_role(r.company_id, 'finance'))
  )
  or exists (
    select 1 from payroll_items pi join employees e on e.id = pi.employee_id
    where pi.id = payroll_item_id and e.auth_user_id = auth.uid()
  )
);

drop policy if exists payroll_deductions_select on payroll_deductions;
create policy payroll_deductions_select on payroll_deductions for select using (
  exists (
    select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id
    where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin') or auth_has_company_role(r.company_id, 'finance'))
  )
  or exists (
    select 1 from payroll_items pi join employees e on e.id = pi.employee_id
    where pi.id = payroll_item_id and e.auth_user_id = auth.uid()
  )
);

-- Additive: payroll_runs_all (admin) and payroll_runs_read_only (hr_admin/
-- finance) already exist as separate permissive policies — Postgres ORs
-- multiple permissive policies together, so this just adds a third path.
drop policy if exists payroll_runs_self_select on payroll_runs;
create policy payroll_runs_self_select on payroll_runs for select using (
  exists (
    select 1 from payroll_items pi join employees e on e.id = pi.employee_id
    where pi.payroll_run_id = payroll_runs.id and e.auth_user_id = auth.uid()
  )
);
