-- Performance management: review cycles, goals, self + manager review — GreytHR-parity spec §16.

create table performance_cycles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  created_at timestamptz not null default now()
);
create index idx_performance_cycles_company on performance_cycles(company_id);

create table goals (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references performance_cycles(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'completed')),
  created_at timestamptz not null default now()
);
create index idx_goals_cycle on goals(cycle_id);
create index idx_goals_employee on goals(employee_id);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references performance_cycles(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  self_rating int check (self_rating between 1 and 5),
  self_comments text,
  manager_rating int check (manager_rating between 1 and 5),
  manager_comments text,
  status text not null default 'pending' check (status in ('pending', 'self_submitted', 'manager_submitted')),
  updated_at timestamptz not null default now(),
  unique (cycle_id, employee_id)
);
create index idx_reviews_cycle on reviews(cycle_id);
create index idx_reviews_employee on reviews(employee_id);

alter table performance_cycles enable row level security;
alter table goals enable row level security;
alter table reviews enable row level security;

drop policy if exists performance_cycles_select on performance_cycles;
create policy performance_cycles_select on performance_cycles for select using (auth_is_company_member(company_id));
drop policy if exists performance_cycles_write on performance_cycles;
create policy performance_cycles_write on performance_cycles for all using (auth_admin_like(company_id)) with check (auth_admin_like(company_id));

drop policy if exists goals_select on goals;
create policy goals_select on goals for select using (
  exists (
    select 1 from performance_cycles c where c.id = cycle_id and (
      auth_admin_like(c.company_id)
      or employee_id = auth_current_employee_id(c.company_id)
      or auth_is_manager_of(employee_id)
    )
  )
);
drop policy if exists goals_insert on goals;
create policy goals_insert on goals for insert with check (
  exists (
    select 1 from performance_cycles c where c.id = cycle_id and (
      auth_admin_like(c.company_id) or employee_id = auth_current_employee_id(c.company_id)
    )
  )
);
drop policy if exists goals_update on goals;
create policy goals_update on goals for update using (
  exists (
    select 1 from performance_cycles c where c.id = cycle_id and (
      auth_admin_like(c.company_id) or employee_id = auth_current_employee_id(c.company_id)
    )
  )
);
drop policy if exists goals_delete on goals;
create policy goals_delete on goals for delete using (
  exists (
    select 1 from performance_cycles c where c.id = cycle_id and (
      auth_admin_like(c.company_id) or employee_id = auth_current_employee_id(c.company_id)
    )
  )
);

drop policy if exists reviews_select on reviews;
create policy reviews_select on reviews for select using (
  exists (
    select 1 from performance_cycles c where c.id = cycle_id and (
      auth_admin_like(c.company_id)
      or employee_id = auth_current_employee_id(c.company_id)
      or auth_is_manager_of(employee_id)
    )
  )
);
drop policy if exists reviews_insert on reviews;
create policy reviews_insert on reviews for insert with check (
  exists (
    select 1 from performance_cycles c where c.id = cycle_id and (
      auth_admin_like(c.company_id) or employee_id = auth_current_employee_id(c.company_id)
    )
  )
);
drop policy if exists reviews_update on reviews;
create policy reviews_update on reviews for update using (
  exists (
    select 1 from performance_cycles c where c.id = cycle_id and (
      auth_admin_like(c.company_id)
      or employee_id = auth_current_employee_id(c.company_id)
      or auth_is_manager_of(employee_id)
    )
  )
);
