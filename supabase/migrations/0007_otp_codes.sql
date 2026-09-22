-- Custom OTP delivery via Resend (support@rhirepro.com) instead of
-- Supabase Auth's own OTP email. Only send-otp/verify-otp (service role)
-- ever touch this table — RLS is enabled with no policies (deny-all to
-- every other caller), consistent with "enable RLS everywhere" even where
-- the client never queries a table directly.

create table otp_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  purpose text not null check (purpose in ('login', 'signup')),
  code_hash text not null, -- sha-256 hex of the 6-digit code; the plaintext code is never stored
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index idx_otp_codes_email_purpose on otp_codes(email, purpose, created_at desc);

alter table otp_codes enable row level security;
