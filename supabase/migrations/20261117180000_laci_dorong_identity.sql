-- Give the Gerai and Klinik drawer entries distinct catalog identities.
-- Keep the already deployed catalog identity for Klinik. Existing assessments under
-- a shared legacy ID cannot be safely split without a remote data audit.
begin;

update public.sarpras_katalog
set kelompok_id='furniture_gerai', nama_item='Laci Dorong', urutan=35, jumlah_rencana=1, aktif=true
where item_id='GRY_LACI_DORONG';

insert into public.sarpras_katalog(item_id,kelompok_id,nama_item,urutan,jumlah_rencana,aktif)
values ('GRY_KLINIK_LACI_DORONG','perlengkapan_klinik','Laci Dorong',40,1,true)
on conflict(item_id) do update set kelompok_id=excluded.kelompok_id,nama_item=excluded.nama_item,
  urutan=excluded.urutan,jumlah_rencana=excluded.jumlah_rencana,aktif=true;

commit;
