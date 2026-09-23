-- Adds the two roles from the spec's 10-role model that were missing from
-- the company_role enum (spec §4) — Recruitment and Performance were
-- previously only reachable via full company-admin-tier access
-- (auth_admin_like), with no narrower role to grant.
--
-- Kept in its own migration/transaction, deliberately not combined with
-- the RLS policy updates that use these values (0020): Postgres cannot
-- reference an enum value added by ALTER TYPE ... ADD VALUE within the
-- same transaction it was added in.

alter type company_role add value if not exists 'recruiter';
alter type company_role add value if not exists 'performance_admin';
