-- Extends Recruitment and Performance write RLS to accept the narrower
-- recruiter/performance_admin roles added in 0019, alongside the existing
-- full-admin (auth_admin_like) access. Select policies already used
-- auth_is_company_member / auth_admin_like-or-self-or-manager, which
-- already cover any company member including these new roles — only the
-- write-side policies needed updating.

drop policy if exists jobs_all on jobs;
create policy jobs_all on jobs for all using (
  auth_admin_like(company_id) or auth_has_company_role(company_id, 'recruiter')
) with check (
  auth_admin_like(company_id) or auth_has_company_role(company_id, 'recruiter')
);

drop policy if exists candidates_all on candidates;
create policy candidates_all on candidates for all using (
  exists (
    select 1 from jobs j where j.id = job_id and (
      auth_admin_like(j.company_id) or auth_has_company_role(j.company_id, 'recruiter')
    )
  )
) with check (
  exists (
    select 1 from jobs j where j.id = job_id and (
      auth_admin_like(j.company_id) or auth_has_company_role(j.company_id, 'recruiter')
    )
  )
);

drop policy if exists interviews_all on interviews;
create policy interviews_all on interviews for all using (
  exists (
    select 1 from candidates c join jobs j on j.id = c.job_id
    where c.id = candidate_id and (auth_admin_like(j.company_id) or auth_has_company_role(j.company_id, 'recruiter'))
  )
) with check (
  exists (
    select 1 from candidates c join jobs j on j.id = c.job_id
    where c.id = candidate_id and (auth_admin_like(j.company_id) or auth_has_company_role(j.company_id, 'recruiter'))
  )
);

drop policy if exists offers_all on offers;
create policy offers_all on offers for all using (
  exists (
    select 1 from candidates c join jobs j on j.id = c.job_id
    where c.id = candidate_id and (auth_admin_like(j.company_id) or auth_has_company_role(j.company_id, 'recruiter'))
  )
) with check (
  exists (
    select 1 from candidates c join jobs j on j.id = c.job_id
    where c.id = candidate_id and (auth_admin_like(j.company_id) or auth_has_company_role(j.company_id, 'recruiter'))
  )
);

drop policy if exists performance_cycles_write on performance_cycles;
create policy performance_cycles_write on performance_cycles for all using (
  auth_admin_like(company_id) or auth_has_company_role(company_id, 'performance_admin')
) with check (
  auth_admin_like(company_id) or auth_has_company_role(company_id, 'performance_admin')
);

drop policy if exists goals_insert on goals;
create policy goals_insert on goals for insert with check (
  exists (
    select 1 from performance_cycles c where c.id = cycle_id and (
      auth_admin_like(c.company_id) or auth_has_company_role(c.company_id, 'performance_admin') or employee_id = auth_current_employee_id(c.company_id)
    )
  )
);
drop policy if exists goals_update on goals;
create policy goals_update on goals for update using (
  exists (
    select 1 from performance_cycles c where c.id = cycle_id and (
      auth_admin_like(c.company_id) or auth_has_company_role(c.company_id, 'performance_admin') or employee_id = auth_current_employee_id(c.company_id)
    )
  )
);
drop policy if exists goals_delete on goals;
create policy goals_delete on goals for delete using (
  exists (
    select 1 from performance_cycles c where c.id = cycle_id and (
      auth_admin_like(c.company_id) or auth_has_company_role(c.company_id, 'performance_admin') or employee_id = auth_current_employee_id(c.company_id)
    )
  )
);

drop policy if exists reviews_update on reviews;
create policy reviews_update on reviews for update using (
  exists (
    select 1 from performance_cycles c where c.id = cycle_id and (
      auth_admin_like(c.company_id)
      or auth_has_company_role(c.company_id, 'performance_admin')
      or employee_id = auth_current_employee_id(c.company_id)
      or auth_is_manager_of(employee_id)
    )
  )
);
