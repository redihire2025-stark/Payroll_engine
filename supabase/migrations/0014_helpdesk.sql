-- Helpdesk: employee ticket creation, assignment, resolution — GreytHR-parity spec §14.

create table tickets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  category text not null,
  subject text not null,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);
create index idx_tickets_company on tickets(company_id);
create index idx_tickets_employee on tickets(employee_id);

create table ticket_comments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets(id) on delete cascade,
  author_id uuid not null references platform_users(id),
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_ticket_comments_ticket on ticket_comments(ticket_id);

alter table tickets enable row level security;
alter table ticket_comments enable row level security;

drop policy if exists tickets_select on tickets;
create policy tickets_select on tickets for select using (
  auth_admin_like(company_id) or employee_id = auth_current_employee_id(company_id)
);
drop policy if exists tickets_insert on tickets;
create policy tickets_insert on tickets for insert with check (
  employee_id = auth_current_employee_id(company_id)
);
drop policy if exists tickets_update on tickets;
create policy tickets_update on tickets for update using (
  auth_admin_like(company_id)
);

drop policy if exists ticket_comments_select on ticket_comments;
create policy ticket_comments_select on ticket_comments for select using (
  exists (
    select 1 from tickets t where t.id = ticket_id and (
      auth_admin_like(t.company_id) or t.employee_id = auth_current_employee_id(t.company_id)
    )
  )
);
drop policy if exists ticket_comments_insert on ticket_comments;
create policy ticket_comments_insert on ticket_comments for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from tickets t where t.id = ticket_id and (
      auth_admin_like(t.company_id) or t.employee_id = auth_current_employee_id(t.company_id)
    )
  )
);
