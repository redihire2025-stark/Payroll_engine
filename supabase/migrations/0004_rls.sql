-- Row Level Security — the primary authorization enforcement layer.
-- See docs/architecture/07-security-rls.md for the policy design this implements.

-- ── Helper functions ─────────────────────────────────────────────────
create or replace function auth_user_company_ids() returns setof uuid as $$
  select company_id from user_company_roles where user_id = auth.uid();
$$ language sql stable security definer;

create or replace function auth_has_company_role(target_company_id uuid, target_role company_role) returns boolean as $$
  select exists (
    select 1 from user_company_roles
    where user_id = auth.uid() and company_id = target_company_id and role = target_role
  );
$$ language sql stable security definer;

create or replace function auth_is_platform_super_admin() returns boolean as $$
  select coalesce((select is_platform_super_admin from platform_users where id = auth.uid()), false);
$$ language sql stable security definer;

create or replace function auth_current_employee_id(target_company_id uuid) returns uuid as $$
  select employee_id from user_company_roles
  where user_id = auth.uid() and company_id = target_company_id and employee_id is not null
  limit 1;
$$ language sql stable security definer;

create or replace function auth_is_manager_of(target_employee_id uuid) returns boolean as $$
  with recursive chain as (
    select id, manager_id from employees where id = target_employee_id
    union all
    select e.id, e.manager_id from employees e join chain c on e.id = c.manager_id
  )
  select exists (
    select 1 from chain c
    join employees mgr on mgr.id = c.manager_id
    where mgr.auth_user_id = auth.uid()
  );
$$ language sql stable security definer;

create or replace function auth_admin_like(target_company_id uuid) returns boolean as $$
  select auth_is_platform_super_admin()
    or auth_has_company_role(target_company_id, 'company_owner')
    or auth_has_company_role(target_company_id, 'company_admin')
    or auth_has_company_role(target_company_id, 'hr_admin');
$$ language sql stable;

-- ── Enable RLS everywhere ────────────────────────────────────────────
do $$
declare t text;
begin
  for t in select unnest(array[
    'companies','company_settings','branches','departments','designations','holidays',
    'employees','employee_profiles','employee_contacts','employee_bank_accounts',
    'employee_tax_profiles','employee_statutory_profiles','employee_documents','employment_history',
    'shifts','shift_assignments','attendance_devices','attendance_records','attendance_corrections',
    'leave_types','leave_policies','leave_balances','leave_requests',
    'salary_components','salary_structures','salary_structure_components','employee_salary_assignments',
    'payroll_rule_sets','payroll_runs','payroll_items','payroll_earnings','payroll_deductions',
    'payroll_contributions','payroll_adjustments','payroll_calculation_logs','payslips',
    'reimbursements','reimbursement_items','loans','loan_repayments',
    'approval_requests','approval_steps','notifications','audit_logs','user_company_roles'
  ]) loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- ── Representative policies (companies, employees, payroll, payslips) ─
-- The remaining tables follow the same company_id + role pattern; each is
-- added in the phase that introduces the table, per docs/architecture/12.

create policy companies_select on companies for select using (
  auth_is_platform_super_admin() or id in (select auth_user_company_ids())
);
create policy companies_update on companies for update using (
  auth_admin_like(id)
);

create policy employees_select on employees for select using (
  auth_admin_like(company_id)
  or auth_has_company_role(company_id, 'payroll_admin')
  or auth_has_company_role(company_id, 'finance')
  or id = auth_current_employee_id(company_id)
  or auth_is_manager_of(id)
);
create policy employees_insert on employees for insert with check (
  auth_admin_like(company_id)
);
create policy employees_update on employees for update using (
  auth_admin_like(company_id)
);

create policy leave_requests_select on leave_requests for select using (
  auth_admin_like(company_id)
  or employee_id = auth_current_employee_id(company_id)
  or auth_is_manager_of(employee_id)
);
create policy leave_requests_insert on leave_requests for insert with check (
  employee_id = auth_current_employee_id(company_id)
);
create policy leave_requests_update on leave_requests for update using (
  auth_admin_like(company_id) or auth_is_manager_of(employee_id)
);

create policy payroll_runs_all on payroll_runs for all using (
  auth_has_company_role(company_id, 'payroll_admin')
  or auth_has_company_role(company_id, 'company_admin')
  or auth_has_company_role(company_id, 'company_owner')
  or auth_is_platform_super_admin()
) with check (
  auth_has_company_role(company_id, 'payroll_admin')
  or auth_has_company_role(company_id, 'company_admin')
  or auth_has_company_role(company_id, 'company_owner')
);
create policy payroll_runs_read_only on payroll_runs for select using (
  auth_has_company_role(company_id, 'hr_admin') or auth_has_company_role(company_id, 'finance')
);

create policy payroll_items_select on payroll_items for select using (
  exists (
    select 1 from payroll_runs r where r.id = payroll_run_id and (
      auth_admin_like(r.company_id)
      or auth_has_company_role(r.company_id, 'payroll_admin')
      or auth_has_company_role(r.company_id, 'finance')
    )
  )
);

-- payslips: self (via employee) or HR/Payroll/manager — no direct insert/update
-- policy for regular users; only the payslip-generate Edge Function (service
-- role) writes rows, bypassing RLS by design.
create policy payslips_select on payslips for select using (
  exists (
    select 1 from payroll_items pi
    join payroll_runs r on r.id = pi.payroll_run_id
    join employees e on e.id = pi.employee_id
    where pi.id = payroll_item_id and (
      e.auth_user_id = auth.uid()
      or auth_admin_like(r.company_id)
      or auth_has_company_role(r.company_id, 'payroll_admin')
      or auth_is_manager_of(e.id)
    )
  )
);

create policy audit_logs_insert on audit_logs for insert with check (true); -- written only via SECURITY DEFINER triggers in application code
create policy audit_logs_select on audit_logs for select using (
  auth_is_platform_super_admin() or (company_id is not null and auth_admin_like(company_id))
);

create policy user_company_roles_select on user_company_roles for select using (
  user_id = auth.uid() or auth_admin_like(company_id)
);
