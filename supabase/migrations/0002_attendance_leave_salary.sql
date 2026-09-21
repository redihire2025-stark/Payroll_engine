-- Attendance, Leave, Salary schema — Phases 3 & 4.

create table shifts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  start_time time not null,
  end_time time not null,
  grace_minutes int not null default 10
);

create table shift_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  shift_id uuid not null references shifts(id),
  effective_from date not null,
  effective_to date
);

create table attendance_devices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  device_type text not null,
  identifier text not null
);

create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  work_date date not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  check_in_source text,
  check_in_location jsonb,
  status text not null default 'present',
  late_minutes int not null default 0,
  overtime_minutes int not null default 0,
  is_manual_entry boolean not null default false,
  created_at timestamptz not null default now(),
  unique (employee_id, work_date)
);
create index idx_attendance_company_date on attendance_records(company_id, work_date);
create index idx_attendance_employee_date on attendance_records(employee_id, work_date);

create table attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  attendance_record_id uuid references attendance_records(id),
  employee_id uuid not null references employees(id) on delete cascade,
  requested_check_in timestamptz,
  requested_check_out timestamptz,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table leave_types (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  code text not null,
  accrual_type text not null default 'fixed',
  is_paid boolean not null default true,
  unique (company_id, code)
);

create table leave_policies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  leave_type_id uuid not null references leave_types(id),
  annual_quota numeric not null,
  carry_forward_max numeric not null default 0,
  encashable boolean not null default false,
  effective_from date not null
);

create table leave_balances (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type_id uuid not null references leave_types(id),
  year int not null,
  opening_balance numeric not null default 0,
  accrued numeric not null default 0,
  used numeric not null default 0,
  carried_forward numeric not null default 0,
  closing_balance numeric not null default 0,
  unique (employee_id, leave_type_id, year)
);

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  leave_type_id uuid not null references leave_types(id),
  start_date date not null,
  end_date date not null,
  days numeric not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  created_at timestamptz not null default now()
);
create index idx_leave_requests_company on leave_requests(company_id);
create index idx_leave_requests_employee on leave_requests(employee_id);

create table salary_components (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  code text not null,
  type text not null check (type in ('earning', 'deduction', 'employer_contribution')),
  calculation_type text not null check (calculation_type in ('fixed', 'percentage_of', 'formula')),
  is_taxable boolean not null default true,
  is_statutory boolean not null default false,
  unique (company_id, code)
);

create table salary_structures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now()
);

create table salary_structure_components (
  id uuid primary key default gen_random_uuid(),
  salary_structure_id uuid not null references salary_structures(id) on delete cascade,
  salary_component_id uuid not null references salary_components(id),
  value_type text not null check (value_type in ('amount', 'percentage')),
  value numeric not null,
  percentage_of_component_id uuid references salary_components(id),
  sequence int not null default 0
);

create table employee_salary_assignments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  salary_structure_id uuid not null references salary_structures(id),
  annual_ctc numeric not null,
  effective_from date not null,
  effective_to date,
  revision_reason text
);
create index idx_salary_assignments_employee on employee_salary_assignments(employee_id);
