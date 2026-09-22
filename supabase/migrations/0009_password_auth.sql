-- Password-based login (alongside OTP, which is retained for recovery/
-- activation/2FA) — see GreytHR-parity spec §5.
--
-- Every account still logs in through Supabase Auth either way (OTP is
-- bridged to a real session, password login uses Supabase's own
-- signInWithPassword against the same auth.users row), so no separate
-- password-hash column is needed here — Supabase/GoTrue already hashes
-- and verifies it. What's new is just tracking whether an account still
-- needs to set a real password (accounts today are created with a
-- throwaway random one via register-company / portal-access).
alter table platform_users add column if not exists must_change_password boolean not null default true;

-- platform_users had RLS enabled nowhere (missed in 0004's enable-list),
-- meaning with Supabase's default grants any authenticated user could
-- read or write ANY row in this table — including another user's
-- is_platform_super_admin flag. Lock it to self-read-only; every write
-- (including must_change_password) goes through a service-role Netlify
-- Function, never a direct client update, so there's no column to protect
-- against a self-escalating update.
alter table platform_users enable row level security;

drop policy if exists platform_users_select_self on platform_users;
create policy platform_users_select_self on platform_users for select using (
  id = auth.uid() or auth_is_platform_super_admin()
);
