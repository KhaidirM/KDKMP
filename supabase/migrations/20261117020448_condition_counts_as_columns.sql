begin;

alter table public.sarpras_isian
  add column if not exists jumlah_baik integer check (jumlah_baik is null or jumlah_baik >= 0),
  add column if not exists jumlah_belum_dicek integer check (jumlah_belum_dicek is null or jumlah_belum_dicek >= 0);

drop trigger if exists sarpras_isian_validate_assessment on public.sarpras_isian;
update public.sarpras_isian set jumlah_aktual=null,jumlah_rusak=null,jumlah_baik=null,jumlah_belum_dicek=null,kondisi=null
where keberadaan is distinct from 'ada';

-- Move old condition allocations out of JSON into typed columns. Legacy scalar
-- condition rows are converted conservatively; all original notes/details remain.
update public.sarpras_isian
set jumlah_baik = case
      when detail ? 'kondisi_jumlah' and coalesce(detail->'kondisi_jumlah'->>'baik','') ~ '^(0|[1-9][0-9]*)$'
        then (detail->'kondisi_jumlah'->>'baik')::integer
      when keberadaan='ada' and kondisi='baik' then greatest(coalesce(jumlah_aktual,0)-coalesce(jumlah_rusak,0),0)
      when keberadaan='ada' and kondisi='rusak' then greatest(coalesce(jumlah_aktual,0)-coalesce(jumlah_rusak,0),0)
      else jumlah_baik end,
    jumlah_rusak = case
      when detail ? 'kondisi_jumlah' and coalesce(detail->'kondisi_jumlah'->>'rusak','') ~ '^(0|[1-9][0-9]*)$'
        then (detail->'kondisi_jumlah'->>'rusak')::integer
      when keberadaan='ada' and kondisi='rusak' then coalesce(nullif(jumlah_rusak,0),jumlah_aktual,0)
      else jumlah_rusak end,
    jumlah_belum_dicek = case
      when detail ? 'kondisi_jumlah' and coalesce(detail->'kondisi_jumlah'->>'belum_dicek','') ~ '^(0|[1-9][0-9]*)$'
        then (detail->'kondisi_jumlah'->>'belum_dicek')::integer
      when keberadaan='ada' and kondisi='belum_dicek' then coalesce(jumlah_aktual,0)
      else jumlah_belum_dicek end
where keberadaan='ada' and (detail ? 'kondisi_jumlah' or kondisi is not null);

update public.sarpras_isian
set detail=detail-'kondisi_jumlah'-'kondisi_pilihan', kondisi=null
where detail ? 'kondisi_jumlah' or detail ? 'kondisi_pilihan' or kondisi is not null;

create or replace function private.kdmp_validate_assessment()
returns trigger language plpgsql set search_path=''
as $$
declare total bigint;
begin
  if new.keberadaan is distinct from 'ada' then
    new.jumlah_baik:=null; new.jumlah_rusak:=null; new.jumlah_belum_dicek:=null;
    new.jumlah_aktual:=null; new.kondisi:=null;
    return new;
  end if;

  if new.jumlah_baik is not null or new.jumlah_rusak is not null or new.jumlah_belum_dicek is not null then
    if new.jumlah_baik is null or new.jumlah_rusak is null or new.jumlah_belum_dicek is null then
      raise exception 'Isi jumlah Baik, Rusak, dan Belum Dicek semuanya.';
    end if;
    total:=new.jumlah_baik::bigint+new.jumlah_rusak::bigint+new.jumlah_belum_dicek::bigint;
    if total>2147483647 then raise exception 'Jumlah kondisi terlalu besar.'; end if;
    new.jumlah_aktual:=total::integer;
    new.kondisi:=null;
  end if;
  return new;
end
$$;
drop trigger if exists sarpras_isian_validate_assessment on public.sarpras_isian;
create trigger sarpras_isian_validate_assessment
before insert or update of keberadaan,kondisi,jumlah_aktual,jumlah_rusak,jumlah_baik,jumlah_belum_dicek,detail
on public.sarpras_isian for each row execute function private.kdmp_validate_assessment();

create or replace function private.kdmp_save_form(t text,n text,rows jsonb,groups jsonb) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb; cnt integer; group_cnt integer; expected_rows integer; expected_groups integer;
begin
  s:=private.kdmp_check(t);
  if s->>'role'='guest' then raise exception 'Guest hanya dapat melihat'; end if;
  if s->>'role' in ('manager','pengurus') and s->>'nik' is distinct from n then raise exception 'Tidak berhak mengubah koperasi ini'; end if;
  if not exists(select 1 from public.index_kdkmp_lahat where "NIK"::text=n) then raise exception 'NIK koperasi tidak ditemukan'; end if;
  if jsonb_typeof(rows)<>'array' or jsonb_array_length(rows)>120 then raise exception 'Form tidak valid'; end if;
  expected_rows:=jsonb_array_length(rows);
  insert into public.sarpras_isian as old
    (nik_koperasi,item_id,tipe_dipilih,keberadaan,kondisi,jumlah_aktual,jumlah_rusak,jumlah_baik,jumlah_belum_dicek,catatan,detail,versi,diubah_pada,diubah_oleh_role,diubah_oleh_nik)
  select n,x.item_id,x.tipe_dipilih,x.keberadaan,null,x.jumlah_aktual,x.jumlah_rusak,x.jumlah_baik,x.jumlah_belum_dicek,x.catatan,coalesce(x.detail,'{}'::jsonb),1,now(),s->>'role',s->>'nik'
  from jsonb_to_recordset(rows) as x(item_id text,expected_versi bigint,tipe_dipilih text,keberadaan text,jumlah_aktual integer,jumlah_rusak integer,jumlah_baik integer,jumlah_belum_dicek integer,catatan text,detail jsonb)
  join public.sarpras_katalog k on k.item_id=x.item_id and k.aktif
  on conflict(nik_koperasi,item_id) do update set
    tipe_dipilih=excluded.tipe_dipilih,keberadaan=excluded.keberadaan,kondisi=null,
    jumlah_aktual=excluded.jumlah_aktual,jumlah_rusak=excluded.jumlah_rusak,jumlah_baik=excluded.jumlah_baik,jumlah_belum_dicek=excluded.jumlah_belum_dicek,
    catatan=excluded.catatan,detail=excluded.detail,versi=old.versi+1,diubah_pada=now(),diubah_oleh_role=excluded.diubah_oleh_role,diubah_oleh_nik=excluded.diubah_oleh_nik
  where (select x2.expected_versi from jsonb_to_recordset(rows) as x2(item_id text,expected_versi bigint) where x2.item_id=excluded.item_id) is null
    or old.versi=(select x2.expected_versi from jsonb_to_recordset(rows) as x2(item_id text,expected_versi bigint) where x2.item_id=excluded.item_id);
  get diagnostics cnt=row_count;
  if cnt<>expected_rows then raise exception 'Form berubah di server sejak dibuka. Muat data terbaru sebelum menyimpan.'; end if;

  expected_groups:=jsonb_array_length(coalesce(groups,'[]'::jsonb));
  insert into public.sarpras_isian_kelompok as old(nik_koperasi,kelompok_id,penilaian_awal,versi,diubah_pada)
  select n,x.kelompok_id,x.penilaian_awal,1,now() from jsonb_to_recordset(coalesce(groups,'[]'::jsonb)) as x(kelompok_id text,penilaian_awal text,expected_versi bigint)
  join public.sarpras_kelompok g on g.kelompok_id=x.kelompok_id and g.aktif
  on conflict(nik_koperasi,kelompok_id) do update set penilaian_awal=excluded.penilaian_awal,versi=old.versi+1,diubah_pada=now()
  where (select x2.expected_versi from jsonb_to_recordset(coalesce(groups,'[]'::jsonb)) as x2(kelompok_id text,expected_versi bigint) where x2.kelompok_id=excluded.kelompok_id) is null
    or old.versi=(select x2.expected_versi from jsonb_to_recordset(coalesce(groups,'[]'::jsonb)) as x2(kelompok_id text,expected_versi bigint) where x2.kelompok_id=excluded.kelompok_id);
  get diagnostics group_cnt=row_count;
  if group_cnt<>expected_groups then raise exception 'Penilaian kelompok berubah di server. Muat ulang form sebelum menyimpan.'; end if;
  insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sesudah)
  values(s->>'role',n,'simpan','sarpras_isian','form',jsonb_build_object('rows',cnt,'groups',group_cnt));
  return jsonb_build_object('saved_rows',cnt,'saved_groups',group_cnt,'saved_at',now());
end
$$;

create or replace function public.kdmp_save_form(p_token text,p_nik text,p_rows jsonb,p_groups jsonb) returns jsonb
language sql security invoker set search_path=''
as $$ select private.kdmp_save_form(p_token,p_nik,p_rows,p_groups) $$;

create or replace function private.kdmp_audit_item_change() returns trigger
language plpgsql security definer set search_path=''
as $$
declare before_value jsonb; after_value jsonb; actor_role text;
begin
  actor_role:=coalesce(nullif(current_setting('app.actor_role',true),''),new.diubah_oleh_role);
  if actor_role is null then return new; end if;
  after_value:=jsonb_build_object('tipe_dipilih',new.tipe_dipilih,'keberadaan',new.keberadaan,
    'jumlah_baik',new.jumlah_baik,'jumlah_rusak',new.jumlah_rusak,'jumlah_belum_dicek',new.jumlah_belum_dicek,
    'jumlah_aktual',new.jumlah_aktual,'catatan',new.catatan,'detail',coalesce(new.detail,'{}'::jsonb),'lampiran',coalesce(new.lampiran,'[]'::jsonb));
  if tg_op='UPDATE' then
    before_value:=jsonb_build_object('tipe_dipilih',old.tipe_dipilih,'keberadaan',old.keberadaan,
      'jumlah_baik',old.jumlah_baik,'jumlah_rusak',old.jumlah_rusak,'jumlah_belum_dicek',old.jumlah_belum_dicek,
      'jumlah_aktual',old.jumlah_aktual,'catatan',old.catatan,'detail',coalesce(old.detail,'{}'::jsonb),'lampiran',coalesce(old.lampiran,'[]'::jsonb));
    if before_value is not distinct from after_value then return new; end if;
  elsif new.keberadaan is null and new.tipe_dipilih is null and new.jumlah_aktual is null and nullif(new.catatan,'') is null
    and coalesce(new.detail,'{}'::jsonb)='{}'::jsonb and coalesce(new.lampiran,'[]'::jsonb)='[]'::jsonb then return new;
  end if;
  insert into public.log_aktivitas(role,nik_koperasi,aktivitas,entitas,kunci_data,nilai_sebelum,nilai_sesudah)
  values(actor_role,new.nik_koperasi,case when tg_op='INSERT' then 'tambah' else 'ubah' end,'sarpras_isian',new.item_id,before_value,after_value);
  return new;
end
$$;

create or replace function private.kdmp_dashboard(t text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb; result jsonb;
begin
  s:=private.kdmp_check(t);
  with catalog as (select item_id,jumlah_rencana from public.sarpras_katalog where aktif),
  item_rows as (
    select i."NIK"::text as nik,i."KDKMP" as kdkmp,i."DESA - KELURAHAN" as desa,i."KECAMATAN" as kecamatan,
      c.item_id,c.jumlah_rencana,x.keberadaan,x.jumlah_aktual,x.jumlah_rusak,x.jumlah_baik,x.jumlah_belum_dicek,x.diubah_pada
    from public.index_kdkmp_lahat i cross join catalog c
    left join public.sarpras_isian x on x.nik_koperasi=i."NIK"::text and x.item_id=c.item_id where true
  ),
  coop_rows as (
    select nik,kdkmp,desa,kecamatan,count(*)::integer as items_total,count(*) filter(where keberadaan is not null)::integer as items_rated,
      count(*) filter(where keberadaan='ada' and (jumlah_baik is null or jumlah_baik>0) and coalesce(jumlah_rusak,0)=0 and coalesce(jumlah_belum_dicek,0)=0 and (jumlah_rencana is null or jumlah_aktual>=jumlah_rencana))::integer as items_ready,
      count(*) filter(where keberadaan='tidak_ada')::integer as items_missing,
      count(*) filter(where coalesce(jumlah_rusak,0)>0)::integer as items_damaged,
      count(*) filter(where coalesce(jumlah_belum_dicek,0)>0)::integer as items_unchecked,
      count(*) filter(where keberadaan='ada' and jumlah_rencana is not null and jumlah_aktual is not null and jumlah_aktual<jumlah_rencana)::integer as items_below_plan,
      count(*) filter(where keberadaan='tidak_ada' or coalesce(jumlah_rusak,0)>0 or coalesce(jumlah_belum_dicek,0)>0 or (keberadaan='ada' and jumlah_rencana is not null and jumlah_aktual<jumlah_rencana))::integer as items_attention,
      max(diubah_pada) as last_saved_at from item_rows group by nik,kdkmp,desa,kecamatan
  ),
  totals as (select count(*)::integer as coop_count,count(distinct kecamatan)::integer as district_count,coalesce(sum(items_total),0)::integer as items_total,
    coalesce(sum(items_rated),0)::integer as items_rated,coalesce(sum(items_ready),0)::integer as items_ready,coalesce(sum(items_missing),0)::integer as items_missing,
    coalesce(sum(items_damaged),0)::integer as items_damaged,coalesce(sum(items_unchecked),0)::integer as items_unchecked,coalesce(sum(items_below_plan),0)::integer as items_below_plan,
    coalesce(sum(items_attention),0)::integer as items_attention,count(*) filter(where items_rated=0)::integer as coops_not_started,count(*) filter(where items_rated>0)::integer as coops_started,
    count(*) filter(where items_rated>=items_total)::integer as coops_complete,count(*) filter(where items_attention>0)::integer as coops_attention,max(last_saved_at) as last_saved_at from coop_rows),
  districts as (select coalesce(jsonb_agg(jsonb_build_object('kecamatan',kecamatan,'coop_count',coop_count,'coops_started',coops_started,'completion_pct',case when items_total=0 then 0 else round(items_rated*100.0/items_total)::integer end,'items_total',items_total,'items_rated',items_rated) order by kecamatan),'[]'::jsonb) as value
    from (select kecamatan,count(*)::integer as coop_count,count(*) filter(where items_rated>0)::integer as coops_started,sum(items_total)::integer as items_total,sum(items_rated)::integer as items_rated from coop_rows group by kecamatan) d),
  priorities as (select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'count',count,'coops',coops) order by case kind when 'missing' then 1 when 'damaged' then 2 when 'unchecked' then 3 else 4 end),'[]'::jsonb) as value
    from (select 'missing'::text as kind,coalesce(sum(items_missing),0)::integer as count,count(*) filter(where items_missing>0)::integer as coops from coop_rows
      union all select 'damaged',coalesce(sum(items_damaged),0)::integer,count(*) filter(where items_damaged>0)::integer from coop_rows
      union all select 'unchecked',coalesce(sum(items_unchecked),0)::integer,count(*) filter(where items_unchecked>0)::integer from coop_rows
      union all select 'below',coalesce(sum(items_below_plan),0)::integer,count(*) filter(where items_below_plan>0)::integer from coop_rows) p)
  select jsonb_build_object('generated_at',now(),'coops',coalesce((select jsonb_agg(jsonb_build_object('nik',nik,'kdkmp',kdkmp,'desa',desa,'kecamatan',kecamatan,'items_total',items_total,'items_rated',items_rated,'items_ready',items_ready,'items_missing',items_missing,'items_damaged',items_damaged,'items_unchecked',items_unchecked,'items_below_plan',items_below_plan,'items_attention',items_attention,'last_saved_at',last_saved_at) order by kecamatan,desa) from coop_rows),'[]'::jsonb),'districts',districts.value,'priorities',priorities.value,
    'totals',jsonb_build_object('coop_count',totals.coop_count,'district_count',totals.district_count,'items_total',totals.items_total,'items_rated',totals.items_rated,'items_scored',totals.items_rated,'items_unrated',greatest(totals.items_total-totals.items_rated,0),'items_ready',totals.items_ready,'items_missing',totals.items_missing,'items_damaged',totals.items_damaged,'items_unchecked',totals.items_unchecked,'items_below_plan',totals.items_below_plan,'items_attention',totals.items_attention,'coops_not_started',totals.coops_not_started,'coops_started',totals.coops_started,'coops_complete',totals.coops_complete,'coops_attention',totals.coops_attention,'last_saved_at',totals.last_saved_at))
    into result from totals cross join districts cross join priorities;
  return result;
end
$$;

commit;
