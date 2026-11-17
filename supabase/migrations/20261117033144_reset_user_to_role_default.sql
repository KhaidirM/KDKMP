begin;

-- Keep only bcrypt templates for manager/pengurus role defaults. Plaintext
-- passwords are never stored here or returned by the reset RPC.
create table private.app_role_password_defaults (
  role text primary key check (role in ('manager','pengurus')),
  password_hash text not null
);

insert into private.app_role_password_defaults(role,password_hash) values
  ('manager','$2a$06$6ubesuyuL5BeGXhS/K3aGOpbojT8Kb4NC6.Gpa6dFIqJFgQebjM3a'),
  ('pengurus','$2a$06$ZF0bMfYOpVqWlowm7V/zIuhsnsddP9ndNYuUNTTBr3rMyC1XhqJEW');

alter table private.app_role_password_defaults enable row level security;
revoke all on private.app_role_password_defaults from public,anon,authenticated;
create policy app_role_password_defaults_api_deny
  on private.app_role_password_defaults for all to anon,authenticated
  using (false) with check (false);

comment on table private.app_role_password_defaults is
  'Private bcrypt templates used only to restore manager/pengurus credentials to their original role defaults.';

create or replace function private.kdmp_reset_user_password(t text,target_role text,target_nik text)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare actor jsonb; default_hash text; revoked_count integer;
begin
  actor:=private.kdmp_check(t);
  if actor->>'role'<>'pmo' then raise exception 'Reset sandi hanya dapat dilakukan oleh PMO'; end if;
  if target_role not in ('manager','pengurus') then raise exception 'Role akun tidak dapat direset melalui fitur ini'; end if;
  if target_nik !~ '^[0-9]{13}$' or not exists (
    select 1 from public.index_kdkmp_lahat where "NIK"=target_nik::bigint
  ) then raise exception 'NIK koperasi tidak ditemukan'; end if;

  select password_hash into default_hash
    from private.app_role_password_defaults where role=target_role;
  if default_hash is null then raise exception 'Sandi awal role belum tersedia'; end if;

  perform 1 from private.app_user_passwords
    where role=target_role and user_key=target_nik for update;
  if not found then raise exception 'Akun role pada koperasi ini tidak ditemukan'; end if;

  update private.app_user_passwords
    set password_hash=default_hash,updated_at=now()
    where role=target_role and user_key=target_nik;

  delete from private.app_sessions where role=target_role and nik=target_nik;
  get diagnostics revoked_count=row_count;

  insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sesudah)
    values('pmo',nullif(actor->>'nik',''),'reset_sandi_ke_awal_role','app_user_passwords',
      target_role||':'||target_nik,
      jsonb_build_object('target_role',target_role,'target_nik',target_nik,
        'sesi_dicabut',revoked_count,'hasil','sandi_awal_role'));

  return jsonb_build_object('reset',true,'sessions_revoked',revoked_count);
end
$$;

create or replace function public.kdmp_reset_user_password(p_token text,p_target_role text,p_target_nik text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.kdmp_reset_user_password(p_token,p_target_role,p_target_nik) $$;

revoke all on function private.kdmp_reset_user_password(text,text,text) from public,anon,authenticated;
grant execute on function private.kdmp_reset_user_password(text,text,text) to anon,authenticated;
revoke all on function public.kdmp_reset_user_password(text,text,text) from public;
grant execute on function public.kdmp_reset_user_password(text,text,text) to anon,authenticated;

commit;
