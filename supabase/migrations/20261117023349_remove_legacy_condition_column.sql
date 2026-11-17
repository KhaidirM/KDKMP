begin;

-- Replace the scalar condition value with explicit per-condition quantities.
create or replace function private.kdmp_validate_assessment()
returns trigger language plpgsql set search_path=''
as $$
declare total bigint;
begin
  if new.keberadaan is distinct from 'ada' then
    new.jumlah_baik:=null;
    new.jumlah_rusak:=null;
    new.jumlah_belum_dicek:=null;
    new.jumlah_aktual:=null;
    return new;
  end if;

  if num_nonnulls(new.jumlah_baik,new.jumlah_rusak,new.jumlah_belum_dicek) not in (0,3) then
    raise exception 'Isi jumlah Baik, Rusak, dan Belum Dicek semuanya.';
  end if;
  if new.jumlah_baik is not null then
    total:=new.jumlah_baik::bigint+new.jumlah_rusak::bigint+new.jumlah_belum_dicek::bigint;
    if total>2147483647 then raise exception 'Jumlah kondisi terlalu besar.'; end if;
    new.jumlah_aktual:=total::integer;
  end if;
  return new;
end
$$;

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
    (nik_koperasi,item_id,tipe_dipilih,keberadaan,jumlah_aktual,jumlah_rusak,jumlah_baik,jumlah_belum_dicek,catatan,detail,versi,diubah_pada,diubah_oleh_role,diubah_oleh_nik)
  select n,x.item_id,x.tipe_dipilih,x.keberadaan,x.jumlah_aktual,x.jumlah_rusak,x.jumlah_baik,x.jumlah_belum_dicek,x.catatan,coalesce(x.detail,'{}'::jsonb),1,now(),s->>'role',s->>'nik'
  from jsonb_to_recordset(rows) as x(item_id text,expected_versi bigint,tipe_dipilih text,keberadaan text,jumlah_aktual integer,jumlah_rusak integer,jumlah_baik integer,jumlah_belum_dicek integer,catatan text,detail jsonb)
  join public.sarpras_katalog k on k.item_id=x.item_id and k.aktif
  on conflict(nik_koperasi,item_id) do update set
    tipe_dipilih=excluded.tipe_dipilih,keberadaan=excluded.keberadaan,jumlah_aktual=excluded.jumlah_aktual,
    jumlah_rusak=excluded.jumlah_rusak,jumlah_baik=excluded.jumlah_baik,jumlah_belum_dicek=excluded.jumlah_belum_dicek,
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

drop trigger if exists sarpras_isian_validate_assessment on public.sarpras_isian;
alter table public.sarpras_isian drop constraint if exists sarpras_isian_kondisi_check;
alter table public.sarpras_isian drop constraint if exists sarpras_isian_check1;
alter table public.sarpras_isian drop column kondisi;
create trigger sarpras_isian_validate_assessment
before insert or update of keberadaan,jumlah_aktual,jumlah_rusak,jumlah_baik,jumlah_belum_dicek,detail
on public.sarpras_isian for each row execute function private.kdmp_validate_assessment();

revoke all on function private.kdmp_validate_assessment(),private.kdmp_save_form(text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function private.kdmp_save_form(text,text,jsonb,jsonb) to anon,authenticated;
commit;
