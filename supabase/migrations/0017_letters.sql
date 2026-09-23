-- Letters: template builder with merge fields, generated employee letters —
-- GreytHR-parity spec §15.

create table letter_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  letter_type text not null default 'custom' check (letter_type in (
    'offer', 'appointment', 'confirmation', 'promotion', 'increment',
    'transfer', 'salary_certificate', 'experience', 'relieving', 'custom'
  )),
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_letter_templates_company on letter_templates(company_id);

create table employee_letters (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  template_id uuid references letter_templates(id) on delete set null,
  title text not null,
  rendered_body text not null,
  storage_path text not null,
  generated_at timestamptz not null default now()
);
create index idx_employee_letters_company on employee_letters(company_id);
create index idx_employee_letters_employee on employee_letters(employee_id);

alter table letter_templates enable row level security;
alter table employee_letters enable row level security;

drop policy if exists letter_templates_all on letter_templates;
create policy letter_templates_all on letter_templates for all using (auth_admin_like(company_id)) with check (auth_admin_like(company_id));

drop policy if exists employee_letters_select on employee_letters;
create policy employee_letters_select on employee_letters for select using (
  auth_admin_like(company_id) or employee_id = auth_current_employee_id(company_id)
);
drop policy if exists employee_letters_insert on employee_letters;
create policy employee_letters_insert on employee_letters for insert with check (
  auth_admin_like(company_id)
);
drop policy if exists employee_letters_delete on employee_letters;
create policy employee_letters_delete on employee_letters for delete using (
  auth_admin_like(company_id)
);

-- Private bucket — no client SELECT policy, same pattern as payslips/employee-documents:
-- reads go through get-letter-url.ts, which re-checks self-or-admin server-side.
insert into storage.buckets (id, name, public)
values ('employee-letters', 'employee-letters', false)
on conflict (id) do nothing;

drop policy if exists employee_letters_bucket_write on storage.objects;
create policy employee_letters_bucket_write on storage.objects for insert with check (
  bucket_id = 'employee-letters' and auth_admin_like((storage.foldername(name))[1]::uuid)
);
