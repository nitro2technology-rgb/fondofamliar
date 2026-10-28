-- Semana 2 · cuotas generadas desde la cadena, reuniones y almacenamiento de capturas NU.

-- Reuniones: una por cada fecha de la cadena.
insert into reuniones (fecha)
select fecha_reunion from cadena_turnos
on conflict (fecha) do nothing;

-- Genera la cuota de cada asociado activo para cada mes de la cadena.
-- El mes en que le toca el turno, la parte de cadena es 0. Se puede volver a ejecutar sin duplicar.
create or replace function generar_cuotas() returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
  v_ahorro bigint := (select valor from parametros where clave = 'cuota_ahorro');
  v_cadena bigint := (select valor from parametros where clave = 'cuota_cadena');
  v_juegos bigint := (select valor from parametros where clave = 'cuota_juegos');
begin
  if auth.uid() is not null and not es_admin() then
    raise exception 'Solo un administrador puede generar cuotas';
  end if;

  insert into cuotas (asociado_id, periodo, ahorro, cadena, juegos)
  select p.id,
         date_trunc('month', t.fecha_reunion)::date,
         v_ahorro,
         case when t.asociado_id = p.id then 0 else v_cadena end,
         v_juegos
  from perfiles p
  cross join cadena_turnos t
  where p.activo
  on conflict (asociado_id, periodo) do nothing;

  get diagnostics n = row_count;
  return n;
end $$;

select generar_cuotas();

-- Capturas mensuales de la cuenta NU (archivo privado; solo administradores).
insert into storage.buckets (id, name, public)
values ('capturas-nu', 'capturas-nu', false)
on conflict (id) do nothing;

create policy capturas_nu_leer on storage.objects for select
  using (bucket_id = 'capturas-nu' and es_admin());
create policy capturas_nu_subir on storage.objects for insert
  with check (bucket_id = 'capturas-nu' and es_admin());
create policy capturas_nu_reemplazar on storage.objects for update
  using (bucket_id = 'capturas-nu' and es_admin());
