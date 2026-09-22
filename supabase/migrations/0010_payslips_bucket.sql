-- Private storage for generated payslip PDFs — see
-- GreytHR-parity spec §13 (Payslips) and §19 ("signed URLs, short expiry,
-- for all document/payslip access — no long-lived or public links").
--
-- Deliberately no SELECT policy on this bucket: reads only ever happen
-- through the get-payslip-url Netlify Function (service role), which
-- mints a short-lived signed URL after checking the same authorization
-- the payslips table's own RLS already encodes (self, or admin/payroll_
-- admin/manager for that company). Writes are allowed directly from an
-- authenticated admin session, mirroring the company-logos bucket policy.

insert into storage.buckets (id, name, public)
values ('payslips', 'payslips', false)
on conflict (id) do nothing;

drop policy if exists payslips_bucket_write on storage.objects;
create policy payslips_bucket_write on storage.objects for insert with check (
  bucket_id = 'payslips' and (
    auth_admin_like((storage.foldername(name))[1]::uuid)
    or auth_has_company_role((storage.foldername(name))[1]::uuid, 'payroll_admin')
  )
);
