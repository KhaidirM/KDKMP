begin;

-- Transaction id groups all item/group audit entries created by one save RPC.
alter table public.log_aktivitas add column if not exists batch_id bigint;
create index if not exists log_aktivitas_batch_idx on public.log_aktivitas(batch_id);

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
  new.batch_id:=coalesce(new.batch_id,txid_current());
  return new;
end
$$;

create or replace function private.kdmp_audit_item_change() returns trigger
language plpgsql security definer set search_path=''
as $$
declare before_value jsonb; after_value jsonb; actor_role text; actor_nik text;
begin
  actor_role:=coalesce(nullif(current_setting('app.actor_role',true),''),new.diubah_oleh_role);
  actor_nik:=nullif(current_setting('app.actor_nik',true),'');
  if actor_role is null then return new; end if;
  after_value:=jsonb_build_object('tipe_dipilih',new.tipe_dipilih,'keberadaan',new.keberadaan,
    'kondisi',new.kondisi,'jumlah_aktual',new.jumlah_aktual,'jumlah_rusak',new.jumlah_rusak,
    'catatan',new.catatan,'detail',coalesce(new.detail,'{}'::jsonb),'lampiran',coalesce(new.lampiran,'[]'::jsonb));
  if tg_op='UPDATE' then
    before_value:=jsonb_build_object('tipe_dipilih',old.tipe_dipilih,'keberadaan',old.keberadaan,
      'kondisi',old.kondisi,'jumlah_aktual',old.jumlah_aktual,'jumlah_rusak',old.jumlah_rusak,
      'catatan',old.catatan,'detail',coalesce(old.detail,'{}'::jsonb),'lampiran',coalesce(old.lampiran,'[]'::jsonb));
    if before_value is not distinct from after_value then return new; end if;
  elsif new.keberadaan is null and new.tipe_dipilih is null and new.jumlah_aktual is null
    and new.jumlah_rusak is null and nullif(new.catatan,'') is null
    and coalesce(new.detail,'{}'::jsonb)='{}'::jsonb and coalesce(new.lampiran,'[]'::jsonb)='[]'::jsonb then
    return new;
  end if;
  insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sebelum,nilai_sesudah)
  values(actor_role,new.nik_koperasi,case when tg_op='INSERT' then 'tambah' else 'ubah' end,
    'sarpras_isian',new.item_id,before_value,after_value);
  return new;
end
$$;

create or replace function private.kdmp_audit_group_change() returns trigger
language plpgsql security definer set search_path=''
as $$
declare before_value jsonb; after_value jsonb; actor_role text; actor_nik text;
begin
  actor_role:=nullif(current_setting('app.actor_role',true),'');
  actor_nik:=nullif(current_setting('app.actor_nik',true),'');
  if actor_role is null then return new; end if;
  after_value:=jsonb_build_object('penilaian_awal',new.penilaian_awal);
  if tg_op='UPDATE' then
    before_value:=jsonb_build_object('penilaian_awal',old.penilaian_awal);
    if before_value is not distinct from after_value then return new; end if;
  elsif new.penilaian_awal is null then
    return new;
  end if;
  insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sebelum,nilai_sesudah)
  values(actor_role,new.nik_koperasi,case when tg_op='INSERT' then 'tambah' else 'ubah' end,
    'sarpras_isian_kelompok',new.kelompok_id,before_value,after_value);
  return new;
end
$$;

drop trigger if exists kdmp_audit_sarpras_isian on public.sarpras_isian;
create trigger kdmp_audit_sarpras_isian after insert or update on public.sarpras_isian
for each row execute function private.kdmp_audit_item_change();
drop trigger if exists kdmp_audit_sarpras_isian_kelompok on public.sarpras_isian_kelompok;
create trigger kdmp_audit_sarpras_isian_kelompok after insert or update on public.sarpras_isian_kelompok
for each row execute function private.kdmp_audit_group_change();

revoke all on function private.kdmp_audit_item_change(),private.kdmp_audit_group_change() from public,anon,authenticated;
commit;
