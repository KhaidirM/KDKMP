begin;

create or replace function private.kdmp_change_password(t text,current_password text,new_password text)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb; v_user_key text; old_hash text;
begin
  s:=private.kdmp_check(t);
  if s->>'role' in ('pmo','guest') then raise exception 'Role ini tidak mengubah sandi melalui profil'; end if;
  if length(coalesce(new_password,''))<8 then raise exception 'Kata sandi baru minimal 8 karakter'; end if;
  v_user_key:=s->>'nik';
  select password_hash into old_hash from private.app_user_passwords
    where app_user_passwords.role=s->>'role' and app_user_passwords.user_key=v_user_key for update;
  if old_hash is null or extensions.crypt(coalesce(current_password,''),old_hash)<>old_hash then raise exception 'Kata sandi saat ini tidak sesuai'; end if;
  if extensions.crypt(new_password,old_hash)=old_hash then raise exception 'Gunakan kata sandi yang berbeda'; end if;
  update private.app_user_passwords set password_hash=extensions.crypt(new_password,extensions.gen_salt('bf',12)),updated_at=now()
    where app_user_passwords.role=s->>'role' and app_user_passwords.user_key=v_user_key;
  insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sesudah)
    values(s->>'role',nullif(s->>'nik',''),'ganti_kata_sandi','app_user_passwords',v_user_key,jsonb_build_object('berhasil',true));
  delete from private.app_sessions where role=s->>'role' and nik is not distinct from nullif(s->>'nik','');
  return jsonb_build_object('changed',true,'sessions_invalidated',true);
end
$$;

revoke all on function private.kdmp_change_password(text,text,text) from public,anon,authenticated;
grant execute on function private.kdmp_change_password(text,text,text) to anon,authenticated;

commit;
