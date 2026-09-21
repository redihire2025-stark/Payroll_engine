-- Payroll engine schema — Phase 5. Statutory rules are configuration
-- (payroll_rule_sets), not code — see docs/architecture/08-payroll-domain.md.

create table payroll_rule_sets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade, -- null = platform default
  country_code text not null default 'IN',
  rule_key text not null,
  version text not null,
  effective_from date not null,
  effective_to date,
  config jsonb not null
);
create index idx_rule_sets_company_key on payroll_rule_sets(company_id, rule_key);

create type payroll_run_status as enum (
  'draft', 'calculating', 'calculated', 'under_review', 'approved', 'locked', 'paid', 'cancelled'
);

create table payroll_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  period_start date not null,
  period_end date not null,
  run_type text not null default 'regular' check (run_type in ('regular', 'off_cycle', 'fnf')),
  status payroll_run_status not null default 'draft',
  calculated_at timestamptz,
  calculated_by uuid references platform_users(id),
  approved_at timestamptz,
  approved_by uuid references platform_users(id),
  locked_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references platform_users(id)
);
create index idx_payroll_runs_company on payroll_runs(company_id);

-- Enforces the state machine: legal transitions only, and blocks any write
-- once locked. Mirrors docs/architecture/08-payroll-domain.md §8.3.
create or replace function guard_payroll_run_transition() returns trigger as $$
declare
  legal boolean;
begin
  if old.status = new.status then
    return new;
  end if;
  legal := case old.status
    when 'draft' then new.status in ('calculating', 'cancelled')
    when 'calculating' then new.status in ('calculated', 'cancelled')
    when 'calculated' then new.status in ('under_review', 'cancelled')
    when 'under_review' then new.status in ('approved', 'draft', 'cancelled')
    when 'approved' then new.status in ('locked')
    when 'locked' then new.status in ('paid')
    else false
  end;
  if not legal then
    raise exception 'Illegal payroll run transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_payroll_run_transition
  before update of status on payroll_runs
  for each row execute function guard_payroll_run_transition();

create table payroll_items (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references payroll_runs(id) on delete cascade,
  employee_id uuid not null references employees(id),
  salary_structure_snapshot jsonb not null,
  gross_earnings numeric not null,
  total_deductions numeric not null,
  net_pay numeric not null,
  lop_days numeric not null default 0,
  status text not null default 'calculated',
  unique (payroll_run_id, employee_id)
);
create index idx_payroll_items_run on payroll_items(payroll_run_id);

create table payroll_earnings (
  id uuid primary key default gen_random_uuid(),
  payroll_item_id uuid not null references payroll_items(id) on delete cascade,
  component_code text not null,
  amount numeric not null,
  computed_from jsonb
);

create table payroll_deductions (
  id uuid primary key default gen_random_uuid(),
  payroll_item_id uuid not null references payroll_items(id) on delete cascade,
  component_code text not null,
  amount numeric not null,
  computed_from jsonb
);

create table payroll_contributions (
  id uuid primary key default gen_random_uuid(),
  payroll_item_id uuid not null references payroll_items(id) on delete cascade,
  component_code text not null,
  amount numeric not null,
  computed_from jsonb
);

create table payroll_adjustments (
  id uuid primary key default gen_random_uuid(),
  payroll_item_id uuid not null references payroll_items(id),
  type text not null check (type in ('arrear', 'correction', 'reversal')),
  amount numeric not null,
  reason text not null,
  created_by uuid references platform_users(id),
  created_at timestamptz not null default now()
);

create table payroll_calculation_logs (
  id uuid primary key default gen_random_uuid(),
  payroll_run_id uuid not null references payroll_runs(id) on delete cascade,
  employee_id uuid not null references employees(id),
  rule_key text not null,
  input_snapshot jsonb not null,
  output_snapshot jsonb not null,
  rule_version text not null,
  created_at timestamptz not null default now()
);
create index idx_calc_logs_run on payroll_calculation_logs(payroll_run_id);

-- Blocks any write to item-level rows once the parent run is locked or paid.
create or replace function guard_locked_payroll_items() returns trigger as $$
declare
  run_status payroll_run_status;
begin
  select status into run_status from payroll_runs where id = coalesce(new.payroll_run_id, old.payroll_run_id);
  if run_status in ('locked', 'paid') then
    raise exception 'Cannot modify payroll items on a % run — create a payroll_adjustment instead', run_status;
  end if;
  return coalesce(new, old);
end;
$$ language plpgsql;

create trigger trg_guard_payroll_items
  before insert or update or delete on payroll_items
  for each row execute function guard_locked_payroll_items();

create table payslips (
  id uuid primary key default gen_random_uuid(),
  payroll_item_id uuid not null unique references payroll_items(id),
  storage_path text not null,
  generated_at timestamptz not null default now(),
  generated_by text not null default 'system'
);

-- ── Reimbursements / Loans (Phase 7) ────────────────────────────────
create table reimbursements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  total_amount numeric not null default 0,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  created_at timestamptz not null default now()
);

create table reimbursement_items (
  id uuid primary key default gen_random_uuid(),
  reimbursement_id uuid not null references reimbursements(id) on delete cascade,
  category text not null,
  amount numeric not null,
  receipt_document_id uuid references employee_documents(id),
  expense_date date not null
);

create table loans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  principal_amount numeric not null,
  interest_rate numeric not null default 0,
  tenure_months int not null,
  disbursed_at date,
  status text not null default 'pending'
);

create table loan_repayments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  installment_number int not null,
  due_date date not null,
  amount numeric not null,
  payroll_item_id uuid references payroll_items(id),
  status text not null default 'pending'
);

-- ── Cross-cutting ─────────────────────────────────────────────────────
create table approval_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  requested_by uuid references platform_users(id),
  current_step int not null default 1,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now()
);

create table approval_steps (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references approval_requests(id) on delete cascade,
  step_number int not null,
  approver_role company_role,
  approver_user_id uuid references platform_users(id),
  decided_by uuid references platform_users(id),
  decision text check (decision in ('approved', 'rejected')),
  decided_at timestamptz,
  comment text
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references platform_users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  channel text not null default 'in_app',
  created_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id),
  actor_id uuid references platform_users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);
create index idx_audit_logs_company on audit_logs(company_id, created_at desc);
