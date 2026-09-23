-- Tax declarations: employee investment/exemption declarations per
-- financial year, with admin verification, feeding the TDS calculation —
-- GreytHR-parity spec §12. Proof documents reuse the existing
-- employee_documents table/bucket rather than a second file pipeline.

create table tax_declarations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  financial_year text not null,
  regime text not null default 'old' check (regime in ('old', 'new')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, financial_year)
);
create index idx_tax_declarations_company on tax_declarations(company_id);
create index idx_tax_declarations_employee on tax_declarations(employee_id);

create table tax_declaration_items (
  id uuid primary key default gen_random_uuid(),
  declaration_id uuid not null references tax_declarations(id) on delete cascade,
  section text not null,
  description text,
  declared_amount numeric not null default 0,
  document_id uuid references employee_documents(id) on delete set null,
  status text not null default 'declared' check (status in ('declared', 'proof_uploaded', 'verified', 'rejected')),
  created_at timestamptz not null default now()
);
create index idx_tax_declaration_items_declaration on tax_declaration_items(declaration_id);

alter table tax_declarations enable row level security;
alter table tax_declaration_items enable row level security;

drop policy if exists tax_declarations_select on tax_declarations;
create policy tax_declarations_select on tax_declarations for select using (
  auth_admin_like(company_id) or employee_id = auth_current_employee_id(company_id)
);
drop policy if exists tax_declarations_insert on tax_declarations;
create policy tax_declarations_insert on tax_declarations for insert with check (
  employee_id = auth_current_employee_id(company_id)
);
drop policy if exists tax_declarations_update on tax_declarations;
create policy tax_declarations_update on tax_declarations for update using (
  employee_id = auth_current_employee_id(company_id)
);

drop policy if exists tax_declaration_items_select on tax_declaration_items;
create policy tax_declaration_items_select on tax_declaration_items for select using (
  exists (
    select 1 from tax_declarations d where d.id = declaration_id and (
      auth_admin_like(d.company_id) or d.employee_id = auth_current_employee_id(d.company_id)
    )
  )
);
drop policy if exists tax_declaration_items_insert on tax_declaration_items;
create policy tax_declaration_items_insert on tax_declaration_items for insert with check (
  exists (
    select 1 from tax_declarations d where d.id = declaration_id and d.employee_id = auth_current_employee_id(d.company_id)
  )
);
drop policy if exists tax_declaration_items_update on tax_declaration_items;
create policy tax_declaration_items_update on tax_declaration_items for update using (
  exists (
    select 1 from tax_declarations d where d.id = declaration_id and (
      auth_admin_like(d.company_id) or d.employee_id = auth_current_employee_id(d.company_id)
    )
  )
);
drop policy if exists tax_declaration_items_delete on tax_declaration_items;
create policy tax_declaration_items_delete on tax_declaration_items for delete using (
  exists (
    select 1 from tax_declarations d where d.id = declaration_id and d.employee_id = auth_current_employee_id(d.company_id)
  )
);
