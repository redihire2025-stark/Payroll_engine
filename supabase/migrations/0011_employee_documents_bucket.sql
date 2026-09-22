-- Private storage for employee documents (ID proofs, certificates, etc.)
-- — GreytHR-parity spec §8/§15. Path convention: {company_id}/{employee_id}/{filename},
-- mirroring the payslips bucket's approach: writes are allowed directly
-- from an authorized session, reads only via a signed-URL Netlify
-- Function (get-document-url) that re-checks the same authorization the
-- employee_documents table's own RLS already encodes (self or admin).

insert into storage.buckets (id, name, public)
values ('employee-documents', 'employee-documents', false)
on conflict (id) do nothing;

drop policy if exists employee_documents_bucket_write on storage.objects;
create policy employee_documents_bucket_write on storage.objects for insert with check (
  bucket_id = 'employee-documents' and (
    auth_admin_like((storage.foldername(name))[1]::uuid)
    or exists (
      select 1 from employees e
      where e.company_id = (storage.foldername(name))[1]::uuid
        and e.id = (storage.foldername(name))[2]::uuid
        and e.auth_user_id = auth.uid()
    )
  )
);
