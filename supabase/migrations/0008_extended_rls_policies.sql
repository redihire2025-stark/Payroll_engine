-- Extended RLS policies for every table that 0004 enabled RLS on but never
-- gave an explicit policy to (0004's own comment deferred these to "the
-- phase that introduces the table" — none of those follow-up migrations
-- ever landed). With RLS enabled and zero policies, Postgres denies every
-- row to every non-superuser role by default, so all of these tables have
-- been completely unreadable/unwritable from the client since 0004 first
-- ran, regardless of the user's role.

create or replace function auth_is_company_member(target_company_id uuid) returns boolean as $$
  select auth_is_platform_super_admin() or exists (
    select 1 from user_company_roles where user_id = auth.uid() and company_id = target_company_id
  );
$$ language sql stable security definer;

-- ── Company reference / lookup data ──────────────────────────────────
-- Readable by any member of the company, writable only by admin-like roles.

drop policy if exists company_settings_select on company_settings;
create policy company_settings_select on company_settings for select using (auth_is_company_member(company_id));
drop policy if exists company_settings_write on company_settings;
create policy company_settings_write on company_settings for update using (auth_admin_like(company_id));

drop policy if exists branches_select on branches;
create policy branches_select on branches for select using (auth_is_company_member(company_id));
drop policy if exists branches_write on branches;
create policy branches_write on branches for all using (auth_admin_like(company_id)) with check (auth_admin_like(company_id));

drop policy if exists departments_select on departments;
create policy departments_select on departments for select using (auth_is_company_member(company_id));
drop policy if exists departments_write on departments;
create policy departments_write on departments for all using (auth_admin_like(company_id)) with check (auth_admin_like(company_id));

drop policy if exists designations_select on designations;
create policy designations_select on designations for select using (auth_is_company_member(company_id));
drop policy if exists designations_write on designations;
create policy designations_write on designations for all using (auth_admin_like(company_id)) with check (auth_admin_like(company_id));

drop policy if exists holidays_select on holidays;
create policy holidays_select on holidays for select using (auth_is_company_member(company_id));
drop policy if exists holidays_write on holidays;
create policy holidays_write on holidays for all using (auth_admin_like(company_id)) with check (auth_admin_like(company_id));

drop policy if exists shifts_select on shifts;
create policy shifts_select on shifts for select using (auth_is_company_member(company_id));
drop policy if exists shifts_write on shifts;
create policy shifts_write on shifts for all using (auth_admin_like(company_id)) with check (auth_admin_like(company_id));

drop policy if exists leave_types_select on leave_types;
create policy leave_types_select on leave_types for select using (auth_is_company_member(company_id));
drop policy if exists leave_types_write on leave_types;
create policy leave_types_write on leave_types for all using (auth_admin_like(company_id)) with check (auth_admin_like(company_id));

drop policy if exists leave_policies_select on leave_policies;
create policy leave_policies_select on leave_policies for select using (auth_is_company_member(company_id));
drop policy if exists leave_policies_write on leave_policies;
create policy leave_policies_write on leave_policies for all using (auth_admin_like(company_id)) with check (auth_admin_like(company_id));

-- ── Employee sub-tables (no direct company_id — derive via employees) ──

drop policy if exists employee_profiles_select on employee_profiles;
create policy employee_profiles_select on employee_profiles for select using (
  exists (
    select 1 from employees e where e.id = employee_id and (
      auth_admin_like(e.company_id)
      or auth_has_company_role(e.company_id, 'payroll_admin')
      or auth_has_company_role(e.company_id, 'finance')
      or e.auth_user_id = auth.uid()
      or auth_is_manager_of(e.id)
    )
  )
);
drop policy if exists employee_profiles_write on employee_profiles;
create policy employee_profiles_write on employee_profiles for all using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid()))
) with check (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid()))
);

drop policy if exists employee_contacts_select on employee_contacts;
create policy employee_contacts_select on employee_contacts for select using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid()))
);
drop policy if exists employee_contacts_write on employee_contacts;
create policy employee_contacts_write on employee_contacts for all using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid()))
) with check (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid()))
);

drop policy if exists employee_bank_accounts_select on employee_bank_accounts;
create policy employee_bank_accounts_select on employee_bank_accounts for select using (
  exists (
    select 1 from employees e where e.id = employee_id and (
      auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'payroll_admin')
      or auth_has_company_role(e.company_id, 'finance') or e.auth_user_id = auth.uid()
    )
  )
);
drop policy if exists employee_bank_accounts_write on employee_bank_accounts;
create policy employee_bank_accounts_write on employee_bank_accounts for all using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid()))
) with check (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid()))
);

drop policy if exists employee_tax_profiles_select on employee_tax_profiles;
create policy employee_tax_profiles_select on employee_tax_profiles for select using (
  exists (
    select 1 from employees e where e.id = employee_id and (
      auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'payroll_admin') or e.auth_user_id = auth.uid()
    )
  )
);
drop policy if exists employee_tax_profiles_write on employee_tax_profiles;
create policy employee_tax_profiles_write on employee_tax_profiles for all using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid()))
) with check (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid()))
);

-- Statutory IDs (PF/UAN/ESI) are employer-verified — self can read, only admin/payroll can write.
drop policy if exists employee_statutory_profiles_select on employee_statutory_profiles;
create policy employee_statutory_profiles_select on employee_statutory_profiles for select using (
  exists (
    select 1 from employees e where e.id = employee_id and (
      auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'payroll_admin') or e.auth_user_id = auth.uid()
    )
  )
);
drop policy if exists employee_statutory_profiles_write on employee_statutory_profiles;
create policy employee_statutory_profiles_write on employee_statutory_profiles for all using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'payroll_admin')))
) with check (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'payroll_admin')))
);

drop policy if exists employee_documents_select on employee_documents;
create policy employee_documents_select on employee_documents for select using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid()))
);
drop policy if exists employee_documents_write on employee_documents;
create policy employee_documents_write on employee_documents for all using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid()))
) with check (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid()))
);

drop policy if exists employment_history_select on employment_history;
create policy employment_history_select on employment_history for select using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid() or auth_is_manager_of(e.id)))
);
drop policy if exists employment_history_write on employment_history;
create policy employment_history_write on employment_history for insert with check (
  exists (select 1 from employees e where e.id = employee_id and auth_admin_like(e.company_id))
);

-- ── Attendance ────────────────────────────────────────────────────────

drop policy if exists shift_assignments_select on shift_assignments;
create policy shift_assignments_select on shift_assignments for select using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid() or auth_is_manager_of(e.id)))
);
drop policy if exists shift_assignments_write on shift_assignments;
create policy shift_assignments_write on shift_assignments for all using (
  exists (select 1 from employees e where e.id = employee_id and auth_admin_like(e.company_id))
) with check (
  exists (select 1 from employees e where e.id = employee_id and auth_admin_like(e.company_id))
);

drop policy if exists attendance_devices_all on attendance_devices;
create policy attendance_devices_all on attendance_devices for all using (auth_admin_like(company_id)) with check (auth_admin_like(company_id));

drop policy if exists attendance_records_select on attendance_records;
create policy attendance_records_select on attendance_records for select using (
  auth_admin_like(company_id)
  or employee_id = auth_current_employee_id(company_id)
  or auth_is_manager_of(employee_id)
);
drop policy if exists attendance_records_insert on attendance_records;
create policy attendance_records_insert on attendance_records for insert with check (
  auth_admin_like(company_id) or employee_id = auth_current_employee_id(company_id)
);
drop policy if exists attendance_records_update on attendance_records;
create policy attendance_records_update on attendance_records for update using (
  auth_admin_like(company_id) or employee_id = auth_current_employee_id(company_id)
);

drop policy if exists attendance_corrections_select on attendance_corrections;
create policy attendance_corrections_select on attendance_corrections for select using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid() or auth_is_manager_of(e.id)))
);
drop policy if exists attendance_corrections_insert on attendance_corrections;
create policy attendance_corrections_insert on attendance_corrections for insert with check (
  exists (select 1 from employees e where e.id = employee_id and e.auth_user_id = auth.uid())
);
drop policy if exists attendance_corrections_update on attendance_corrections;
create policy attendance_corrections_update on attendance_corrections for update using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or auth_is_manager_of(e.id)))
);

-- ── Leave balances (system-computed; self/manager/admin read, admin write) ─

drop policy if exists leave_balances_select on leave_balances;
create policy leave_balances_select on leave_balances for select using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or e.auth_user_id = auth.uid() or auth_is_manager_of(e.id)))
);
drop policy if exists leave_balances_write on leave_balances;
create policy leave_balances_write on leave_balances for all using (
  exists (select 1 from employees e where e.id = employee_id and auth_admin_like(e.company_id))
) with check (
  exists (select 1 from employees e where e.id = employee_id and auth_admin_like(e.company_id))
);

-- ── Salary ────────────────────────────────────────────────────────────

drop policy if exists salary_components_select on salary_components;
create policy salary_components_select on salary_components for select using (
  auth_admin_like(company_id) or auth_has_company_role(company_id, 'payroll_admin') or auth_has_company_role(company_id, 'finance')
);
drop policy if exists salary_components_write on salary_components;
create policy salary_components_write on salary_components for all using (
  auth_admin_like(company_id) or auth_has_company_role(company_id, 'payroll_admin')
) with check (
  auth_admin_like(company_id) or auth_has_company_role(company_id, 'payroll_admin')
);

drop policy if exists salary_structures_select on salary_structures;
create policy salary_structures_select on salary_structures for select using (
  auth_admin_like(company_id) or auth_has_company_role(company_id, 'payroll_admin') or auth_has_company_role(company_id, 'finance')
);
drop policy if exists salary_structures_write on salary_structures;
create policy salary_structures_write on salary_structures for all using (
  auth_admin_like(company_id) or auth_has_company_role(company_id, 'payroll_admin')
) with check (
  auth_admin_like(company_id) or auth_has_company_role(company_id, 'payroll_admin')
);

drop policy if exists salary_structure_components_all on salary_structure_components;
create policy salary_structure_components_all on salary_structure_components for all using (
  exists (
    select 1 from salary_structures s where s.id = salary_structure_id and (
      auth_admin_like(s.company_id) or auth_has_company_role(s.company_id, 'payroll_admin') or auth_has_company_role(s.company_id, 'finance')
    )
  )
) with check (
  exists (
    select 1 from salary_structures s where s.id = salary_structure_id and (
      auth_admin_like(s.company_id) or auth_has_company_role(s.company_id, 'payroll_admin')
    )
  )
);

drop policy if exists employee_salary_assignments_select on employee_salary_assignments;
create policy employee_salary_assignments_select on employee_salary_assignments for select using (
  exists (
    select 1 from employees e where e.id = employee_id and (
      auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'payroll_admin')
      or auth_has_company_role(e.company_id, 'finance') or e.auth_user_id = auth.uid()
    )
  )
);
drop policy if exists employee_salary_assignments_write on employee_salary_assignments;
create policy employee_salary_assignments_write on employee_salary_assignments for all using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'payroll_admin')))
) with check (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'payroll_admin')))
);

-- ── Payroll rule sets (company_id null = platform default, read-only to tenants) ─

drop policy if exists payroll_rule_sets_select on payroll_rule_sets;
create policy payroll_rule_sets_select on payroll_rule_sets for select using (
  company_id is null or auth_admin_like(company_id) or auth_has_company_role(company_id, 'payroll_admin')
);
drop policy if exists payroll_rule_sets_write on payroll_rule_sets;
create policy payroll_rule_sets_write on payroll_rule_sets for all using (
  company_id is not null and (auth_admin_like(company_id) or auth_has_company_role(company_id, 'payroll_admin'))
) with check (
  company_id is not null and (auth_admin_like(company_id) or auth_has_company_role(company_id, 'payroll_admin'))
);

-- ── Payroll item children — same visibility as their parent payroll_items ─

drop policy if exists payroll_earnings_select on payroll_earnings;
create policy payroll_earnings_select on payroll_earnings for select using (
  exists (
    select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id
    where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin') or auth_has_company_role(r.company_id, 'finance'))
  )
);
drop policy if exists payroll_earnings_write on payroll_earnings;
create policy payroll_earnings_write on payroll_earnings for all using (
  exists (select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin')))
) with check (
  exists (select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin')))
);

drop policy if exists payroll_deductions_select on payroll_deductions;
create policy payroll_deductions_select on payroll_deductions for select using (
  exists (
    select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id
    where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin') or auth_has_company_role(r.company_id, 'finance'))
  )
);
drop policy if exists payroll_deductions_write on payroll_deductions;
create policy payroll_deductions_write on payroll_deductions for all using (
  exists (select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin')))
) with check (
  exists (select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin')))
);

drop policy if exists payroll_contributions_select on payroll_contributions;
create policy payroll_contributions_select on payroll_contributions for select using (
  exists (
    select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id
    where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin') or auth_has_company_role(r.company_id, 'finance'))
  )
);
drop policy if exists payroll_contributions_write on payroll_contributions;
create policy payroll_contributions_write on payroll_contributions for all using (
  exists (select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin')))
) with check (
  exists (select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin')))
);

drop policy if exists payroll_adjustments_all on payroll_adjustments;
create policy payroll_adjustments_all on payroll_adjustments for all using (
  exists (select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin')))
) with check (
  exists (select 1 from payroll_items pi join payroll_runs r on r.id = pi.payroll_run_id where pi.id = payroll_item_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin')))
);

drop policy if exists payroll_calculation_logs_all on payroll_calculation_logs;
create policy payroll_calculation_logs_all on payroll_calculation_logs for all using (
  exists (select 1 from payroll_runs r where r.id = payroll_run_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin')))
) with check (
  exists (select 1 from payroll_runs r where r.id = payroll_run_id and (auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'payroll_admin')))
);

-- ── Reimbursements & Loans ────────────────────────────────────────────

drop policy if exists reimbursements_select on reimbursements;
create policy reimbursements_select on reimbursements for select using (
  auth_admin_like(company_id) or auth_has_company_role(company_id, 'finance')
  or employee_id = auth_current_employee_id(company_id) or auth_is_manager_of(employee_id)
);
drop policy if exists reimbursements_insert on reimbursements;
create policy reimbursements_insert on reimbursements for insert with check (
  employee_id = auth_current_employee_id(company_id)
);
drop policy if exists reimbursements_update on reimbursements;
create policy reimbursements_update on reimbursements for update using (
  auth_admin_like(company_id) or auth_has_company_role(company_id, 'finance')
);

drop policy if exists reimbursement_items_all on reimbursement_items;
create policy reimbursement_items_all on reimbursement_items for all using (
  exists (
    select 1 from reimbursements r where r.id = reimbursement_id and (
      auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'finance') or r.employee_id = auth_current_employee_id(r.company_id)
    )
  )
) with check (
  exists (
    select 1 from reimbursements r where r.id = reimbursement_id and (
      auth_admin_like(r.company_id) or auth_has_company_role(r.company_id, 'finance') or r.employee_id = auth_current_employee_id(r.company_id)
    )
  )
);

drop policy if exists loans_select on loans;
create policy loans_select on loans for select using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'finance') or e.auth_user_id = auth.uid()))
);
drop policy if exists loans_write on loans;
create policy loans_write on loans for all using (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'finance')))
) with check (
  exists (select 1 from employees e where e.id = employee_id and (auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'finance')))
);

drop policy if exists loan_repayments_all on loan_repayments;
create policy loan_repayments_all on loan_repayments for all using (
  exists (
    select 1 from loans l join employees e on e.id = l.employee_id
    where l.id = loan_id and (auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'finance') or e.auth_user_id = auth.uid())
  )
) with check (
  exists (
    select 1 from loans l join employees e on e.id = l.employee_id
    where l.id = loan_id and (auth_admin_like(e.company_id) or auth_has_company_role(e.company_id, 'finance'))
  )
);

-- ── Approvals ─────────────────────────────────────────────────────────

drop policy if exists approval_requests_select on approval_requests;
create policy approval_requests_select on approval_requests for select using (
  auth_admin_like(company_id) or requested_by = auth.uid()
);
drop policy if exists approval_requests_insert on approval_requests;
create policy approval_requests_insert on approval_requests for insert with check (
  requested_by = auth.uid() and auth_is_company_member(company_id)
);
drop policy if exists approval_requests_update on approval_requests;
create policy approval_requests_update on approval_requests for update using (
  auth_admin_like(company_id)
);

drop policy if exists approval_steps_select on approval_steps;
create policy approval_steps_select on approval_steps for select using (
  exists (select 1 from approval_requests r where r.id = approval_request_id and (auth_admin_like(r.company_id) or r.requested_by = auth.uid()))
  or approver_user_id = auth.uid()
);
drop policy if exists approval_steps_update on approval_steps;
create policy approval_steps_update on approval_steps for update using (
  approver_user_id = auth.uid()
  or exists (select 1 from approval_requests r where r.id = approval_request_id and auth_admin_like(r.company_id))
);

-- ── Notifications — strictly the recipient's own inbox; inserts only via
-- the send-notification Netlify Function's service role (no client policy) ─

drop policy if exists notifications_select on notifications;
create policy notifications_select on notifications for select using (recipient_id = auth.uid());
drop policy if exists notifications_update on notifications;
create policy notifications_update on notifications for update using (recipient_id = auth.uid());
