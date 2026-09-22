-- Payslip letterhead fields. These were briefly hardcoded as constants when
-- building the payslip template against Redihire's real reference format —
-- moved into the schema so they're real, admin-editable company data
-- (via /admin/company) instead of dummy/hardcoded values.

alter table companies add column reg_office text;
alter table companies add column phone text;
alter table companies add column website text;
alter table companies add column email text;
alter table companies add column cin text;
alter table companies add column state text;
alter table companies add column brand_accent_color text not null default '#0B5D45';
-- Letterhead title styling: the leading N characters of the uppercased
-- company name rendered in brand_accent_color (e.g. 4 = "REDI" of
-- "REDIHIRE"). 0 = no accent-colored prefix, the sane default for a new company.
alter table companies add column name_accent_prefix_length int not null default 0;
