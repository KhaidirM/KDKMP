-- Revised assessment: notes cap and supported mixed-presence group status.
alter table public.sarpras_isian drop constraint if exists sarpras_isian_catatan_check;
alter table public.sarpras_isian add constraint sarpras_isian_catatan_check
  check (catatan is null or char_length(catatan) <= 800);
alter table public.sarpras_isian_kelompok drop constraint if exists sarpras_isian_kelompok_penilaian_awal_check;
alter table public.sarpras_isian_kelompok add constraint sarpras_isian_kelompok_penilaian_awal_check
  check (penilaian_awal is null or penilaian_awal in ('ada','tidak_ada','custom'));
