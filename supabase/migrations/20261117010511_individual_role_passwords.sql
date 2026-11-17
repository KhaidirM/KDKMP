begin;

-- Each login identity gets its own password hash. Seed hashes are copied from
-- the existing role-wide credentials so current passwords keep working.
create table private.app_user_passwords (
  role text not null check (role in ('pmo','manager','pengurus','guest')),
  user_key text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role,user_key),
  check (
    (role='pmo' and user_key in ('1111','2222')) or
    (role in ('manager','pengurus') and user_key ~ '^[0-9]{13}$') or
    (role='guest' and user_key='guest')
  )
);

insert into private.app_user_passwords(role,user_key,password_hash)
select 'pmo',x.user_key,p.pin_hash from (values ('1111'),('2222')) x(user_key)
cross join private.app_role_pins p where p.role='pmo';

insert into private.app_user_passwords(role,user_key,password_hash)
select 'manager',i."NIK"::text,p.pin_hash from public.index_kdkmp_lahat i
cross join private.app_role_pins p where p.role='manager';

insert into private.app_user_passwords(role,user_key,password_hash)
select 'pengurus',i."NIK"::text,p.pin_hash from public.index_kdkmp_lahat i
cross join private.app_role_pins p where p.role='pengurus';

insert into private.app_user_passwords(role,user_key,password_hash)
select 'guest','guest',p.pin_hash from private.app_role_pins p where p.role='guest';

alter table private.app_user_passwords enable row level security;
revoke all on private.app_user_passwords from public,anon,authenticated;
create policy api_deny_all on private.app_user_passwords for all to anon,authenticated using (false) with check (false);

create or replace function private.kdmp_login(r text,n text,p text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare t text; h text; operator_name text; coop_name text; v_user_key text;
begin
  if r not in ('pmo','manager','pengurus','guest') then raise exception 'Login tidak valid'; end if;
  if r='guest' then n:=null; v_user_key:='guest';
  elsif r='pmo' then
    if n not in ('1111','2222') then raise exception 'Pilih identitas PMO'; end if;
    v_user_key:=n;
    if n='1111' then operator_name:='Khaidir'; else operator_name:='Iqnabila'; end if;
  elsif r in ('manager','pengurus') then
    if n !~ '^[0-9]{13}$' then raise exception 'NIK koperasi tidak valid'; end if;
    v_user_key:=n;
    if r='manager' then
      select nullif(m.nama,''),i."KDKMP" into operator_name,coop_name
      from public.index_kdkmp_lahat i left join public.manager m on m.nik_koperasi=i."NIK"
      where i."NIK"=n::bigint order by m.dibuat_pada limit 1;
    else
      select nullif(pg.nama,''),i."KDKMP" into operator_name,coop_name
      from public.index_kdkmp_lahat i left join public.pengurus pg on pg.nik_koperasi=i."NIK"
      where i."NIK"=n::bigint order by pg.dibuat_pada limit 1;
    end if;
    if coop_name is null then raise exception 'Akses koperasi tidak ditemukan'; end if;
    operator_name:=coalesce(operator_name,case when r='manager' then 'Manager' else 'Pengurus' end);
  end if;

  select password_hash into h from private.app_user_passwords where app_user_passwords.role=r and app_user_passwords.user_key=v_user_key;
  if h is null or extensions.crypt(coalesce(p,''),h)<>h then perform pg_sleep(.5);raise exception 'Login tidak valid';end if;
  t:=encode(extensions.gen_random_bytes(32),'hex');
  insert into private.app_sessions values(encode(extensions.digest(t,'sha256'),'hex'),r,nullif(n,''),now()+interval '12 hours');
  perform set_config('app.actor_role',r,true);
  perform set_config('app.actor_nik',coalesce(nullif(n,''),''),true);
  insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sesudah)
    values(r,nullif(n,''),'login','app_sessions',r,jsonb_build_object('berhasil',true));
  return jsonb_build_object('token',t,'role',r,'nik',nullif(n,''),'operator_name',operator_name,'coop_name',coop_name,'expires_at',now()+interval '12 hours');
end
$$;

create or replace function private.kdmp_change_password(t text,current_password text,new_password text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb; v_user_key text; old_hash text;
begin
  s:=private.kdmp_check(t);
  if length(coalesce(new_password,''))<8 then raise exception 'Kata sandi baru minimal 8 karakter'; end if;
  v_user_key:=case when s->>'role'='guest' then 'guest' else s->>'nik' end;
  select password_hash into old_hash from private.app_user_passwords
    where app_user_passwords.role=s->>'role' and app_user_passwords.user_key=v_user_key for update;
  if old_hash is null or extensions.crypt(coalesce(current_password,''),old_hash)<>old_hash then raise exception 'Kata sandi saat ini tidak sesuai'; end if;
  if extensions.crypt(new_password,old_hash)=old_hash then raise exception 'Gunakan kata sandi yang berbeda'; end if;
  update private.app_user_passwords set password_hash=extensions.crypt(new_password,extensions.gen_salt('bf',12)),updated_at=now()
    where app_user_passwords.role=s->>'role' and app_user_passwords.user_key=v_user_key;
  insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sesudah)
    values(s->>'role',nullif(s->>'nik',''),'ganti_kata_sandi','app_user_passwords',v_user_key,jsonb_build_object('berhasil',true));
  delete from private.app_sessions where role=s->>'role' and
    (s->>'role'='guest' or nik is not distinct from nullif(s->>'nik',''));
  return jsonb_build_object('changed',true,'sessions_invalidated',true);
end
$$;

drop table private.app_role_pins;

revoke all on function private.kdmp_login(text,text,text),private.kdmp_change_password(text,text,text) from public,anon,authenticated;
grant execute on function private.kdmp_login(text,text,text),private.kdmp_change_password(text,text,text) to anon,authenticated;
revoke all on function public.kdmp_login(text,text,text),public.kdmp_change_password(text,text,text) from public;
grant execute on function public.kdmp_login(text,text,text),public.kdmp_change_password(text,text,text) to anon,authenticated;

commit;
