-- Bank account number and PAN are stored pgp-encrypted (employee_bank_accounts,
-- employee_tax_profiles — see 0001_core_schema.sql) but nothing ever wrote to
-- those columns: there was no encrypt path, so the admin UI could only ever
-- show "stored encrypted, not displayed here." These RPCs are the encrypt/
-- decrypt path, called exclusively from the employee-bank-details Netlify
-- function (never directly from the browser) with the encryption key it
-- reads from the BANK_DETAILS_ENCRYPTION_KEY server-only env var.
--
-- Every function here is revoked from PUBLIC and granted only to
-- service_role — a plain `create function` grants EXECUTE to PUBLIC by
-- default, which would let any authenticated/anon session call these
-- directly via PostgREST's /rpc endpoint with a guessed employee_id and a
-- guessed key, bypassing the Netlify function's admin-role check entirely.

create or replace function admin_upsert_employee_bank_account(
  p_employee_id uuid, p_bank_name text, p_ifsc text, p_account_number text, p_key text
) returns void as $$
begin
  delete from employee_bank_accounts where employee_id = p_employee_id;
  insert into employee_bank_accounts (employee_id, bank_name, ifsc, account_number_encrypted, is_primary)
  values (p_employee_id, p_bank_name, p_ifsc, pgp_sym_encrypt(p_account_number, p_key), true);
end;
$$ language plpgsql;
revoke all on function admin_upsert_employee_bank_account(uuid, text, text, text, text) from public;
grant execute on function admin_upsert_employee_bank_account(uuid, text, text, text, text) to service_role;

create or replace function admin_upsert_employee_tax_profile(
  p_employee_id uuid, p_pan text, p_key text
) returns void as $$
begin
  insert into employee_tax_profiles (employee_id, pan_encrypted, updated_at)
  values (p_employee_id, pgp_sym_encrypt(p_pan, p_key), now())
  on conflict (employee_id) do update set pan_encrypted = excluded.pan_encrypted, updated_at = now();
end;
$$ language plpgsql;
revoke all on function admin_upsert_employee_tax_profile(uuid, text, text) from public;
grant execute on function admin_upsert_employee_tax_profile(uuid, text, text) to service_role;

create or replace function admin_upsert_employee_statutory_profile(
  p_employee_id uuid, p_pf_number text, p_uan text
) returns void as $$
begin
  insert into employee_statutory_profiles (employee_id, pf_number, uan, updated_at)
  values (p_employee_id, nullif(p_pf_number, ''), nullif(p_uan, ''), now())
  on conflict (employee_id) do update set pf_number = excluded.pf_number, uan = excluded.uan, updated_at = now();
end;
$$ language plpgsql;
revoke all on function admin_upsert_employee_statutory_profile(uuid, text, text) from public;
grant execute on function admin_upsert_employee_statutory_profile(uuid, text, text) to service_role;

-- Read-back is masked by design — callers get the last 4 digits only,
-- never the full decrypted value, so even the admin UI that wrote the
-- data can only ever confirm/display it, not silently exfiltrate it.
create or replace function admin_get_employee_bank_last4(p_employee_id uuid, p_key text)
returns table (bank_name text, ifsc text, account_last4 text) as $$
  select bank_name, ifsc, right(pgp_sym_decrypt(account_number_encrypted, p_key), 4)
  from employee_bank_accounts
  where employee_id = p_employee_id
  order by is_primary desc
  limit 1;
$$ language sql;
revoke all on function admin_get_employee_bank_last4(uuid, text) from public;
grant execute on function admin_get_employee_bank_last4(uuid, text) to service_role;

create or replace function admin_get_employee_pan_last4(p_employee_id uuid, p_key text)
returns text as $$
  select right(pgp_sym_decrypt(pan_encrypted, p_key), 4)
  from employee_tax_profiles
  where employee_id = p_employee_id and pan_encrypted is not null;
$$ language sql;
revoke all on function admin_get_employee_pan_last4(uuid, text) from public;
grant execute on function admin_get_employee_pan_last4(uuid, text) to service_role;
