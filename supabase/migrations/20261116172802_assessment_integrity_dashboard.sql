-- Validate condition allocations and aggregate dashboard status from the same source as Form B.
-- Source migration only; inspect remote migration history and legacy data before applying.
begin;

create or replace function private.kdmp_validate_assessment()
returns trigger language plpgsql set search_path=''
as $$
declare
  a jsonb;
  b integer := 0;
  d integer := 0;
  u integer := 0;
  total integer;
  has_alloc boolean := false;
  v jsonb;
begin
  a := coalesce(new.detail->'kondisi_jumlah','{}'::jsonb);
  if new.detail ? 'kondisi_jumlah' then
    if jsonb_typeof(a) <> 'object' then raise exception 'Rincian kondisi harus berupa objek.'; end if;
    foreach v in array array[a->'baik',a->'rusak',a->'belum_dicek'] loop
      if v is null or jsonb_typeof(v) <> 'number' or (v #>> '{}') !~ '^(0|[1-9][0-9]*)$' then
        raise exception 'Jumlah kondisi harus bilangan bulat nol atau lebih.';
      end if;
    end loop;
    b := (a->>'baik')::integer;
    d := (a->>'rusak')::integer;
    u := (a->>'belum_dicek')::integer;
    total := b+d+u;
    if new.keberadaan='ada' and new.jumlah_aktual is distinct from total then
      raise exception 'Jumlah aktual harus sama dengan total alokasi kondisi.';
    end if;
    if new.keberadaan='ada' and coalesce(new.jumlah_rusak,0) <> d then
      raise exception 'Jumlah rusak harus sama dengan alokasi kondisi Rusak.';
    end if;
    if new.keberadaan is distinct from 'ada' and total<>0 then
      raise exception 'Item Tidak Ada tidak boleh menyimpan alokasi kondisi.';
    end if;
    if new.detail ? 'kondisi_pilihan' then
      if jsonb_typeof(new.detail->'kondisi_pilihan') <> 'object' then raise exception 'Pilihan kondisi tidak valid.'; end if;
      foreach v in array array[new.detail->'kondisi_pilihan'->'baik',new.detail->'kondisi_pilihan'->'rusak',new.detail->'kondisi_pilihan'->'belum_dicek'] loop
        if v is null or jsonb_typeof(v) <> 'boolean' then raise exception 'Pilihan kondisi harus bernilai true atau false.'; end if;
      end loop;
      if d>0 and coalesce(new.detail->'kondisi_pilihan'->>'rusak','false') <> 'true' then raise exception 'Alokasi Rusak harus dipilih.'; end if;
    end if;
  end if;
  return new;
end
$$;

drop trigger if exists sarpras_isian_validate_assessment on public.sarpras_isian;
create trigger sarpras_isian_validate_assessment
before insert or update of keberadaan,kondisi,jumlah_aktual,jumlah_rusak,detail
on public.sarpras_isian for each row execute function private.kdmp_validate_assessment();

create or replace function private.kdmp_dashboard(t text) returns jsonb
language plpgsql security definer set search_path=''
as $$
declare s jsonb; result jsonb;
begin
  s:=private.kdmp_check(t);
  with
  catalog as (select item_id,jumlah_rencana from public.sarpras_katalog where aktif),
  item_rows as (
    select i."NIK"::text as nik,i."KDKMP" as kdkmp,
      i."DESA - KELURAHAN" as desa,i."KECAMATAN" as kecamatan,
      c.item_id,c.jumlah_rencana,x.keberadaan,x.kondisi,x.jumlah_aktual,x.jumlah_rusak,x.detail,x.diubah_pada,
      case when coalesce(x.detail->'kondisi_jumlah'->>'baik','') ~ '^(0|[1-9][0-9]*)$' then (x.detail->'kondisi_jumlah'->>'baik')::integer else 0 end as alloc_good,
      case when coalesce(x.detail->'kondisi_jumlah'->>'rusak','') ~ '^(0|[1-9][0-9]*)$' then (x.detail->'kondisi_jumlah'->>'rusak')::integer else coalesce(x.jumlah_rusak,0) end as alloc_damaged,
      case when coalesce(x.detail->'kondisi_jumlah'->>'belum_dicek','') ~ '^(0|[1-9][0-9]*)$' then (x.detail->'kondisi_jumlah'->>'belum_dicek')::integer else 0 end as alloc_unchecked
    from public.index_kdkmp_lahat i cross join catalog c
    left join public.sarpras_isian x on x.nik_koperasi=i."NIK"::text and x.item_id=c.item_id
    where s->>'role' not in ('manager','pengurus') or i."NIK"::text=s->>'nik'
  ),
  coop_rows as (
    select nik,kdkmp,desa,kecamatan,count(*)::integer as items_total,
      count(*) filter(where keberadaan is not null)::integer as items_rated,
      count(*) filter(where keberadaan='ada' and (
        (detail ? 'kondisi_jumlah' and jumlah_aktual>0 and alloc_good=jumlah_aktual and alloc_damaged=0 and alloc_unchecked=0)
        or (not coalesce(detail ? 'kondisi_jumlah',false) and (kondisi='baik' or kondisi is null) and coalesce(jumlah_rusak,0)=0)
      ) and (jumlah_rencana is null or jumlah_aktual>=jumlah_rencana))::integer as items_ready,
      count(*) filter(where keberadaan='tidak_ada')::integer as items_missing,
      count(*) filter(where alloc_damaged>0 or kondisi='rusak')::integer as items_damaged,
      count(*) filter(where alloc_unchecked>0 or kondisi='belum_dicek')::integer as items_unchecked,
      count(*) filter(where keberadaan='ada' and jumlah_rencana is not null and jumlah_aktual is not null and jumlah_aktual<jumlah_rencana)::integer as items_below_plan,
      count(*) filter(where keberadaan='tidak_ada' or alloc_damaged>0 or kondisi='rusak' or alloc_unchecked>0 or kondisi='belum_dicek' or (keberadaan='ada' and jumlah_rencana is not null and jumlah_aktual<jumlah_rencana))::integer as items_attention,
      max(diubah_pada) as last_saved_at
    from item_rows group by nik,kdkmp,desa,kecamatan
  ),
  coop_json as (
    select coalesce(jsonb_agg(jsonb_build_object('nik',nik,'kdkmp',kdkmp,'desa',desa,'kecamatan',kecamatan,
      'items_total',items_total,'items_rated',items_rated,'items_ready',items_ready,'items_missing',items_missing,
      'items_damaged',items_damaged,'items_unchecked',items_unchecked,'items_below_plan',items_below_plan,
      'items_attention',items_attention,'last_saved_at',last_saved_at) order by kecamatan,desa),'[]'::jsonb) as value from coop_rows
  ),
  total_json as (
    select count(*)::integer as coop_count,count(distinct kecamatan)::integer as district_count,
      coalesce(sum(items_total),0)::integer as items_total,coalesce(sum(items_rated),0)::integer as items_rated,
      coalesce(sum(items_ready),0)::integer as items_ready,coalesce(sum(items_missing),0)::integer as items_missing,
      coalesce(sum(items_damaged),0)::integer as items_damaged,coalesce(sum(items_unchecked),0)::integer as items_unchecked,
      coalesce(sum(items_below_plan),0)::integer as items_below_plan,coalesce(sum(items_attention),0)::integer as items_attention,
      count(*) filter(where items_rated=0)::integer as coops_not_started,
      count(*) filter(where items_rated>0)::integer as coops_started,
      count(*) filter(where items_rated>=items_total)::integer as coops_complete,
      count(*) filter(where items_attention>0)::integer as coops_attention,max(last_saved_at) as last_saved_at from coop_rows
  ),
  district_json as (
    select coalesce(jsonb_agg(jsonb_build_object('kecamatan',kecamatan,'coop_count',coop_count,'coops_started',coops_started,
      'completion_pct',case when items_total=0 then 0 else round(items_rated*100.0/items_total)::integer end,
      'items_total',items_total,'items_rated',items_rated) order by kecamatan),'[]'::jsonb) as value
    from (select kecamatan,count(*)::integer as coop_count,count(*) filter(where items_rated>0)::integer as coops_started,
      sum(items_total)::integer as items_total,sum(items_rated)::integer as items_rated from coop_rows group by kecamatan) d
  ),
  priority_json as (
    select coalesce(jsonb_agg(jsonb_build_object('kind',kind,'count',count,'coops',coops)
      order by case kind when 'missing' then 1 when 'damaged' then 2 when 'unchecked' then 3 else 4 end),'[]'::jsonb) as value
    from (select 'missing'::text as kind,coalesce(sum(items_missing),0)::integer as count,count(*) filter(where items_missing>0)::integer as coops from coop_rows
      union all select 'damaged',coalesce(sum(items_damaged),0)::integer,count(*) filter(where items_damaged>0)::integer from coop_rows
      union all select 'unchecked',coalesce(sum(items_unchecked),0)::integer,count(*) filter(where items_unchecked>0)::integer from coop_rows
      union all select 'below',coalesce(sum(items_below_plan),0)::integer,count(*) filter(where items_below_plan>0)::integer from coop_rows) p
  )
  select jsonb_build_object('generated_at',now(),'coops',co.value,'districts',d.value,'priorities',p.value,
    'totals',jsonb_build_object('coop_count',t.coop_count,'district_count',t.district_count,'items_total',t.items_total,
      'items_rated',t.items_rated,'items_scored',t.items_rated,'items_unrated',greatest(t.items_total-t.items_rated,0),
      'items_ready',t.items_ready,'items_missing',t.items_missing,'items_damaged',t.items_damaged,'items_unchecked',t.items_unchecked,
      'items_below_plan',t.items_below_plan,'items_attention',t.items_attention,'coops_not_started',t.coops_not_started,
      'coops_started',t.coops_started,'coops_complete',t.coops_complete,'coops_attention',t.coops_attention,'last_saved_at',t.last_saved_at))
  into result from coop_json co cross join total_json t cross join district_json d cross join priority_json p;
  return result;
end
$$;

commit;
