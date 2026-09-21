-- Self-service registration support: tenant branding + seat-based licensing.
-- See docs/architecture/16-self-service-onboarding.md.

alter table companies add column logo_url text;
alter table company_settings add column employee_seat_limit int not null default 50;

-- Seats used = employees granted portal login access (auth_user_id set),
-- not merely present as an HR record. Never stored — always live.
create view company_seat_usage as
select
  company_id,
  count(*) filter (where auth_user_id is not null and status = 'active') as seats_used
from employees
group by company_id;

-- Public-read bucket for tenant logos (payslip headers, login/portal branding).
-- Write access restricted to that company's admins via storage policy below.
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

create policy company_logos_public_read on storage.objects for select using (
  bucket_id = 'company-logos'
);

create policy company_logos_admin_write on storage.objects for insert with check (
  bucket_id = 'company-logos'
  and auth_admin_like((storage.foldername(name))[1]::uuid)
);
