-- Recruitment: job postings, candidate pipeline, interviews, offers — GreytHR-parity spec §17.

create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  department text,
  location text,
  employment_type text not null default 'full_time' check (employment_type in ('full_time', 'part_time', 'contract', 'intern')),
  status text not null default 'open' check (status in ('open', 'on_hold', 'closed')),
  created_at timestamptz not null default now()
);
create index idx_jobs_company on jobs(company_id);

create table candidates (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  stage text not null default 'applied' check (stage in ('applied', 'screening', 'interview', 'offer', 'hired', 'rejected')),
  created_at timestamptz not null default now()
);
create index idx_candidates_job on candidates(job_id);

create table interviews (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  scheduled_at timestamptz not null,
  mode text not null default 'video' check (mode in ('phone', 'video', 'onsite')),
  interviewer_name text,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  feedback text,
  created_at timestamptz not null default now()
);
create index idx_interviews_candidate on interviews(candidate_id);

create table offers (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates(id) on delete cascade,
  position_title text not null,
  annual_ctc numeric not null,
  joining_date date,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined')),
  created_at timestamptz not null default now()
);
create index idx_offers_candidate on offers(candidate_id);

alter table jobs enable row level security;
alter table candidates enable row level security;
alter table interviews enable row level security;
alter table offers enable row level security;

drop policy if exists jobs_all on jobs;
create policy jobs_all on jobs for all using (auth_admin_like(company_id)) with check (auth_admin_like(company_id));

drop policy if exists candidates_all on candidates;
create policy candidates_all on candidates for all using (
  exists (select 1 from jobs j where j.id = job_id and auth_admin_like(j.company_id))
) with check (
  exists (select 1 from jobs j where j.id = job_id and auth_admin_like(j.company_id))
);

drop policy if exists interviews_all on interviews;
create policy interviews_all on interviews for all using (
  exists (
    select 1 from candidates c join jobs j on j.id = c.job_id
    where c.id = candidate_id and auth_admin_like(j.company_id)
  )
) with check (
  exists (
    select 1 from candidates c join jobs j on j.id = c.job_id
    where c.id = candidate_id and auth_admin_like(j.company_id)
  )
);

drop policy if exists offers_all on offers;
create policy offers_all on offers for all using (
  exists (
    select 1 from candidates c join jobs j on j.id = c.job_id
    where c.id = candidate_id and auth_admin_like(j.company_id)
  )
) with check (
  exists (
    select 1 from candidates c join jobs j on j.id = c.job_id
    where c.id = candidate_id and auth_admin_like(j.company_id)
  )
);
