-- The browser uses SECURITY DEFINER RPCs. These explicit deny policies make the
-- direct REST table boundary clear and keep all raw identity/session/audit tables closed.
do $$
declare r record;
begin
  for r in select * from (values
    ('private','app_role_pins'),('private','app_sessions'),
    ('public','index_kdkmp_lahat'),('public','manager'),('public','pengurus'),
    ('public','log_aktivitas'),('public','sarpras_isian'),('public','sarpras_isian_kelompok')
  ) as x(sch,tbl) loop
    execute format('drop policy if exists api_deny_all on %I.%I',r.sch,r.tbl);
    execute format('create policy api_deny_all on %I.%I for all to anon, authenticated using (false) with check (false)',r.sch,r.tbl);
  end loop;
end
$$;
