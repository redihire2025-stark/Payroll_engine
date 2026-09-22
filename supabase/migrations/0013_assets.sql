-- Assets: issue/return/transfer — GreytHR-parity spec §15.

create table assets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  category text not null,
  serial_number text,
  status text not null default 'available' check (status in ('available', 'assigned', 'maintenance', 'retired')),
  created_at timestamptz not null default now()
);
create index idx_assets_company on assets(company_id);

create table asset_assignments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  issued_at date not null default current_date,
  returned_at date,
  condition_on_issue text,
  condition_on_return text
);
create index idx_asset_assignments_asset on asset_assignments(asset_id);
create index idx_asset_assignments_employee on asset_assignments(employee_id);

alter table assets enable row level security;
alter table asset_assignments enable row level security;

drop policy if exists assets_select on assets;
create policy assets_select on assets for select using (auth_is_company_member(company_id));
drop policy if exists assets_write on assets;
create policy assets_write on assets for all using (auth_admin_like(company_id)) with check (auth_admin_like(company_id));

drop policy if exists asset_assignments_select on asset_assignments;
create policy asset_assignments_select on asset_assignments for select using (
  exists (
    select 1 from assets a where a.id = asset_id and (
      auth_admin_like(a.company_id)
      or exists (select 1 from employees e where e.id = employee_id and e.auth_user_id = auth.uid())
    )
  )
);
drop policy if exists asset_assignments_write on asset_assignments;
create policy asset_assignments_write on asset_assignments for all using (
  exists (select 1 from assets a where a.id = asset_id and auth_admin_like(a.company_id))
) with check (
  exists (select 1 from assets a where a.id = asset_id and auth_admin_like(a.company_id))
);
