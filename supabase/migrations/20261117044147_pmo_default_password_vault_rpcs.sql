begin;

create or replace function private.kdmp_role_default_password_status(t text,target_role text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare actor jsonb; secret_name text; configured boolean;
begin
  actor:=private.kdmp_check(t);
  if actor->>'role'<>'pmo' then raise exception 'Informasi sandi awal hanya tersedia untuk PMO'; end if;
  if target_role not in ('manager','pengurus') then raise exception 'Role akun tidak valid'; end if;
  secret_name:='kdmp_role_default_'||target_role;
  select exists(select 1 from vault.decrypted_secrets where name=secret_name) into configured;
  return jsonb_build_object('configured',configured);
end
$$;

create or replace function private.kdmp_store_role_default_password(t text,target_role text,p_password text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare actor jsonb; expected_hash text; secret_name text; secret_id uuid;
begin
  actor:=private.kdmp_check(t);
  if actor->>'role'<>'pmo' then raise exception 'Penyimpanan sandi awal hanya dapat dilakukan PMO'; end if;
  if target_role not in ('manager','pengurus') then raise exception 'Role akun tidak valid'; end if;
  if length(coalesce(p_password,''))<1 or length(p_password)>256 then raise exception 'Sandi awal tidak valid'; end if;

  select password_hash into expected_hash from private.app_role_password_defaults
    where role=target_role for update;
  if expected_hash is null or extensions.crypt(p_password,expected_hash)<>expected_hash then
    raise exception 'Sandi tidak cocok dengan sandi awal role yang sedang berlaku';
  end if;

  secret_name:='kdmp_role_default_'||target_role;
  select id into secret_id from vault.decrypted_secrets where name=secret_name order by created_at desc limit 1;
  if secret_id is null then
    perform vault.create_secret(p_password,secret_name,'Sandi awal role KDKMP; hanya dibuka melalui RPC terotorisasi PMO.');
  else
    perform vault.update_secret(secret_id,p_password,secret_name,'Sandi awal role KDKMP; hanya dibuka melalui RPC terotorisasi PMO.');
  end if;

  insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sesudah)
    values('pmo',nullif(actor->>'nik',''),'simpan_sandi_awal_role_terenkripsi','vault',target_role,
      jsonb_build_object('role',target_role,'tersimpan',true));
  return jsonb_build_object('configured',true);
end
$$;

create or replace function private.kdmp_get_role_default_password(t text,target_role text)
returns jsonb language plpgsql security definer set search_path=''
as $$
declare actor jsonb; secret_name text; role_password text;
begin
  actor:=private.kdmp_check(t);
  if actor->>'role'<>'pmo' then raise exception 'Sandi awal hanya dapat dilihat PMO'; end if;
  if target_role not in ('manager','pengurus') then raise exception 'Role akun tidak valid'; end if;
  secret_name:='kdmp_role_default_'||target_role;
  select decrypted_secret into role_password from vault.decrypted_secrets
    where name=secret_name order by created_at desc limit 1;
  if role_password is null then raise exception 'Sandi awal role belum disimpan aman'; end if;
  return jsonb_build_object('password',role_password);
end
$$;

create or replace function public.kdmp_role_default_password_status(p_token text,p_target_role text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.kdmp_role_default_password_status(p_token,p_target_role) $$;
create or replace function public.kdmp_store_role_default_password(p_token text,p_target_role text,p_password text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.kdmp_store_role_default_password(p_token,p_target_role,p_password) $$;
create or replace function public.kdmp_get_role_default_password(p_token text,p_target_role text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.kdmp_get_role_default_password(p_token,p_target_role) $$;

revoke all on function private.kdmp_role_default_password_status(text,text),private.kdmp_store_role_default_password(text,text,text),private.kdmp_get_role_default_password(text,text) from public,anon,authenticated;
grant execute on function private.kdmp_role_default_password_status(text,text),private.kdmp_store_role_default_password(text,text,text),private.kdmp_get_role_default_password(text,text) to anon,authenticated;
revoke all on function public.kdmp_role_default_password_status(text,text),public.kdmp_store_role_default_password(text,text,text),public.kdmp_get_role_default_password(text,text) from public;
grant execute on function public.kdmp_role_default_password_status(text,text),public.kdmp_store_role_default_password(text,text,text),public.kdmp_get_role_default_password(text,text) to anon,authenticated;

commit;
