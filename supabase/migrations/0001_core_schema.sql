-- Core multi-tenant schema: platform, company structure, employees.
-- Mirrors docs/architecture/05-database-erd.md. Not yet applied to a live
-- Supabase project (no project credentials exist in this environment) —
-- this is the real migration to run via `supabase db push` once a project
-- is provisioned.

create extension if not exists pgcrypto;

-- ── Identity / Platform ──────────────────────────────────────────────
create table platform_users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  is_platform_super_admin boolean not null default false,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text not null,
  country_code text not null default 'IN',
  slug text not null unique,
  status text not null default 'active' check (status in ('active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type company_role as enum (
  'company_owner', 'company_admin', 'hr_admin', 'payroll_admin', 'finance', 'manager', 'employee'
);

create table user_company_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references platform_users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  role company_role not null,
  employee_id uuid, -- FK added after `employees` exists
  created_at timestamptz not null default now(),
  unique (user_id, company_id, role)
);
create index idx_user_company_roles_user on user_company_roles(user_id);
create index idx_user_company_roles_company on user_company_roles(company_id);

create table company_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  fiscal_year_start_month int not null default 4,
  default_currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  payroll_cycle_type text not null default 'monthly',
  pay_day int not null default 1,
  updated_at timestamptz not null default now()
);

-- ── Company Structure ────────────────────────────────────────────────
create table branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  address text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_branches_company on branches(company_id);

create table departments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id),
  name text not null,
  parent_department_id uuid references departments(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_departments_company on departments(company_id);

create table designations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now()
);
create index idx_designations_company on designations(company_id);

create table holidays (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  date date not null,
  branch_id uuid references branches(id),
  is_optional boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_holidays_company on holidays(company_id);

-- ── Employees ─────────────────────────────────────────────────────────
create table employees (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_code text not null,
  auth_user_id uuid references auth.users(id),
  branch_id uuid references branches(id),
  department_id uuid references departments(id),
  designation_id uuid references designations(id),
  manager_id uuid references employees(id),
  date_of_joining date not null,
  date_of_exit date,
  employment_type text not null default 'full_time',
  status text not null default 'active' check (status in ('active', 'on_leave', 'exited')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, employee_code)
);
create index idx_employees_company on employees(company_id);
create index idx_employees_manager on employees(manager_id);

alter table user_company_roles
  add constraint fk_user_company_roles_employee foreign key (employee_id) references employees(id);

create table employee_profiles (
  employee_id uuid primary key references employees(id) on delete cascade,
  first_name text not null,
  last_name text,
  dob date,
  gender text,
  personal_email text,
  phone text,
  address jsonb,
  photo_url text,
  updated_at timestamptz not null default now()
);

create table employee_contacts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  type text not null,
  name text not null,
  relation text,
  phone text,
  created_at timestamptz not null default now()
);

-- account_number stored pgp-encrypted at the application layer; column holds ciphertext
create table employee_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  account_number_encrypted bytea not null,
  ifsc text not null,
  bank_name text not null,
  is_primary boolean not null default true,
  created_at timestamptz not null default now()
);

create table employee_tax_profiles (
  employee_id uuid primary key references employees(id) on delete cascade,
  pan_encrypted bytea,
  tax_regime text not null default 'new',
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table employee_statutory_profiles (
  employee_id uuid primary key references employees(id) on delete cascade,
  pf_number text,
  uan text,
  esi_number text,
  extra jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table employee_documents (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  document_type text not null,
  storage_path text not null,
  verified_at timestamptz,
  uploaded_by uuid references platform_users(id),
  created_at timestamptz not null default now()
);

create table employment_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  event_type text not null,
  effective_date date not null,
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- updated_at maintenance trigger, reused by every table with the column
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
declare t text;
begin
  for t in select unnest(array[
    'platform_users','companies','branches','departments','employees',
    'employee_profiles','employee_tax_profiles','employee_statutory_profiles'
  ]) loop
    execute format('create trigger trg_%1$s_updated_at before update on %1$s for each row execute function set_updated_at()', t);
  end loop;
end $$;
