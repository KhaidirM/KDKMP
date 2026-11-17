-- Shared role passwords remain unchanged. This migration adds server audit context,
-- cooperative read-only access and profile/password RPCs while preserving save rules.
create extension if not exists pgcrypto with schema extensions;

alter table private.app_role_pins enable row level security;
alter table private.app_sessions enable row level security;
revoke all on private.app_role_pins, private.app_sessions from public, anon, authenticated;

alter table public.log_aktivitas add column if not exists nik_pelaku text;
alter table public.log_aktivitas add column if not exists ip_address inet;
alter table public.log_aktivitas add column if not exists user_agent text;
alter table public.log_aktivitas add column if not exists waktu_wib timestamp without time zone;
alter table public.log_aktivitas add column if not exists zona_waktu text;

create or replace function private.kdmp_check(t text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb;
begin
  select jsonb_build_object('role',role,'nik',nik,'expires_at',expires_at)
    into s from private.app_sessions
    where token_hash=encode(extensions.digest(coalesce(t,''),'sha256'),'hex') and expires_at>now();
  if s is null then raise exception 'Sesi berakhir'; end if;
  perform set_config('app.actor_role',coalesce(s->>'role',''),true);
  perform set_config('app.actor_nik',coalesce(s->>'nik',''),true);
  return s;
end
$$;

create or replace function private.kdmp_enrich_activity_log() returns trigger
language plpgsql security definer set search_path=''
as $$
declare h jsonb; client_ip text;
begin
  begin
    h:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
    client_ip:=coalesce(h->>'cf-connecting-ip',h->>'x-real-ip',split_part(coalesce(h->>'x-forwarded-for',''),',',1));
    if nullif(btrim(client_ip),'') is not null then new.ip_address:=btrim(client_ip)::inet; end if;
    new.user_agent:=coalesce(new.user_agent,h->>'user-agent');
  exception when others then new.ip_address:=coalesce(new.ip_address,null);
  end;
  new.nik_pelaku:=coalesce(nullif(current_setting('app.actor_nik',true),''),new.nik_pelaku);
  new.waktu:=coalesce(new.waktu,now());
  new.waktu_wib:=timezone('Asia/Jakarta',coalesce(new.waktu,now()));
  new.zona_waktu:='GMT+7';
  return new;
end
$$;
drop trigger if exists kdmp_enrich_activity_log on public.log_aktivitas;
create trigger kdmp_enrich_activity_log before insert on public.log_aktivitas
for each row execute function private.kdmp_enrich_activity_log();

create or replace function private.kdmp_login(r text,n text,p text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare t text; h text; operator_name text; coop_name text;
begin
  if r not in ('pmo','manager','pengurus','guest') then raise exception 'Login tidak valid'; end if;
  select pin_hash into h from private.app_role_pins where role=r;
  if h is null or extensions.crypt(coalesce(p,''),h)<>h then perform pg_sleep(.5);raise exception 'Login tidak valid';end if;
  if r in ('manager','pengurus') then
    if n !~ '^[0-9]{13}$' then raise exception 'NIK koperasi tidak valid';end if;
    if r='manager' then
      select nullif(m.nama,''),i."KDKMP" into operator_name,coop_name from public.manager m left join public.index_kdkmp_lahat i on i."NIK"=m.nik_koperasi where m.nik_koperasi=n::bigint order by m.dibuat_pada limit 1;
    else
      select nullif(peng.nama,''),i."KDKMP" into operator_name,coop_name from public.pengurus peng left join public.index_kdkmp_lahat i on i."NIK"=peng.nik_koperasi where peng.nik_koperasi=n::bigint order by peng.dibuat_pada limit 1;
    end if;
    if r='manager' and not exists(select 1 from public.manager where nik_koperasi=n::bigint) then raise exception 'Akses koperasi tidak ditemukan';end if;
    if r='pengurus' and not exists(select 1 from public.pengurus where nik_koperasi=n::bigint) then raise exception 'Akses koperasi tidak ditemukan';end if;
  elsif r='pmo' then
    if n='1111' then operator_name:='Khaidir'; elsif n='2222' then operator_name:='Iqnabila'; else raise exception 'Pilih identitas PMO'; end if;
  elsif r='guest' then n:=null;
  end if;
  t:=encode(extensions.gen_random_bytes(32),'hex');
  insert into private.app_sessions values(encode(extensions.digest(t,'sha256'),'hex'),r,nullif(n,''),now()+interval '12 hours');
  perform set_config('app.actor_role',r,true);
  perform set_config('app.actor_nik',coalesce(nullif(n,''),''),true);
  insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sesudah)
    values(r,nullif(n,''),'login','app_sessions',r,jsonb_build_object('berhasil',true));
  return jsonb_build_object('token',t,'role',r,'nik',nullif(n,''),'operator_name',operator_name,'coop_name',coop_name,'expires_at',now()+interval '12 hours');
end
$$;

-- Allow directory and dashboard metrics for read-only coop browsing. The public
-- dashboard RPC remains PMO-only; writes remain protected in kdmp_save_form.
do $$
declare d text;
begin
  d:=pg_get_functiondef('private.kdmp_dashboard(text)'::regprocedure);
  if position('where s->>''role'' not in (''manager'',''pengurus'') or i."NIK"::text=s->>''nik''' in d)=0 then
    raise exception 'Dashboard filter source not found; migration stopped to preserve behavior.';
  end if;
  d:=replace(d,'where s->>''role'' not in (''manager'',''pengurus'') or i."NIK"::text=s->>''nik''','where true');
  execute d;
end
$$;
create or replace function private.kdmp_list_coops(t text) returns jsonb
language plpgsql security definer set search_path=''
as $$ declare s jsonb; begin s:=private.kdmp_check(t); return private.kdmp_dashboard(t)->'coops'; end $$;
create or replace function public.kdmp_dashboard(p_token text) returns jsonb
language plpgsql security invoker set search_path=''
as $$ declare s jsonb; begin s:=private.kdmp_check(p_token); if s->>'role'<>'pmo' then raise exception 'Ringkasan hanya tersedia untuk PMO'; end if; return private.kdmp_dashboard(p_token); end $$;

create or replace function private.kdmp_profile(t text,n text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb; coop record; manager_name text; pengurus_names jsonb; actor_name text;
begin
  s:=private.kdmp_check(t);
  if nullif(n,'') is not null then
    select "NIK"::text as nik,"DESA - KELURAHAN" as desa,"KECAMATAN" as kecamatan into coop from public.index_kdkmp_lahat where "NIK"::text=n;
    if not found then raise exception 'Koperasi tidak ditemukan'; end if;
    select nullif(m.nama,'') into manager_name from public.manager m where m.nik_koperasi=n::bigint order by m.dibuat_pada limit 1;
    select coalesce(jsonb_agg(distinct p.nama) filter(where nullif(p.nama,'') is not null),'[]'::jsonb) into pengurus_names from public.pengurus p where p.nik_koperasi=n::bigint;
  end if;
  if s->>'role'='manager' then actor_name:=coalesce((select nullif(m.nama,'') from public.manager m where m.nik_koperasi=(s->>'nik')::bigint order by m.dibuat_pada limit 1),'Manager');
  elsif s->>'role'='pengurus' then actor_name:=coalesce((select nullif(p.nama,'') from public.pengurus p where p.nik_koperasi=(s->>'nik')::bigint order by p.dibuat_pada limit 1),'Pengurus');
  elsif s->>'role'='guest' then actor_name:='Tamu';
  elsif s->>'nik'='1111' then actor_name:='Khaidir';
  elsif s->>'nik'='2222' then actor_name:='Iqnabila';
  else actor_name:='PMO'; end if;
  return jsonb_build_object('role',s->>'role','operator_name',actor_name,'manager_name',manager_name,'pengurus_names',coalesce(pengurus_names,'[]'::jsonb),'nik',coop.nik,'desa',coop.desa,'kecamatan',coop.kecamatan);
end
$$;
create or replace function public.kdmp_profile(p_token text,p_nik text) returns jsonb language sql security invoker set search_path='' as $$ select private.kdmp_profile(p_token,p_nik) $$;

create or replace function private.kdmp_change_password(t text,current_password text,new_password text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb; old_hash text;
begin
  s:=private.kdmp_check(t);
  if length(coalesce(new_password,''))<8 then raise exception 'Kata sandi baru minimal 8 karakter'; end if;
  select pin_hash into old_hash from private.app_role_pins where role=s->>'role' for update;
  if old_hash is null or extensions.crypt(coalesce(current_password,''),old_hash)<>old_hash then raise exception 'Kata sandi saat ini tidak sesuai'; end if;
  if extensions.crypt(new_password,old_hash)=old_hash then raise exception 'Gunakan kata sandi yang berbeda'; end if;
  update private.app_role_pins set pin_hash=extensions.crypt(new_password,extensions.gen_salt('bf',12)) where role=s->>'role';
  insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sesudah) values(s->>'role',nullif(s->>'nik',''),'ganti_kata_sandi','app_role_pins',s->>'role',jsonb_build_object('berhasil',true));
  delete from private.app_sessions where role=s->>'role';
  return jsonb_build_object('changed',true,'sessions_invalidated',true);
end
$$;
create or replace function public.kdmp_change_password(p_token text,p_current_password text,p_new_password text) returns jsonb language sql security invoker set search_path='' as $$ select private.kdmp_change_password(p_token,p_current_password,p_new_password) $$;

revoke all on function private.kdmp_profile(text,text),private.kdmp_change_password(text,text,text) from public,anon,authenticated;
grant execute on function private.kdmp_profile(text,text),private.kdmp_change_password(text,text,text) to anon,authenticated;
revoke all on function public.kdmp_profile(text,text),public.kdmp_change_password(text,text,text) from public;
grant execute on function public.kdmp_profile(text,text),public.kdmp_change_password(text,text,text) to anon,authenticated;

revoke all on public.index_kdkmp_lahat,public.manager,public.pengurus,public.log_aktivitas from public,anon,authenticated;
grant select on public.sarpras_kelompok,public.sarpras_katalog to anon,authenticated;
