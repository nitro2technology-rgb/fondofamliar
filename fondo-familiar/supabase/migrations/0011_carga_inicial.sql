-- Carga inicial desde "Creditos Fondo.xlsx" y aporte inicial de los 19 asociados.
-- Ejecutar UNA sola vez en el SQL Editor. Si algún nombre no coincide, se aborta todo sin cambios.

do $$
declare
  r record;
  v_id uuid;
  v_prestamo uuid;
  n_aportes int;
begin
  -- 1) Aporte inicial ($100.000) de los 19 asociados (fecha del sorteo, 24-oct-2026).
  insert into aportes_unicos (asociado_id, tipo, monto, fecha_pago)
  select id, 'inicial', 100000, date '2026-10-24' from perfiles where activo
  on conflict (asociado_id, tipo) do nothing;

  -- Aporte tecnológico ($20.000) de los 19.
  insert into aportes_unicos (asociado_id, tipo, monto, fecha_pago)
  select id, 'tecnologico', 20000, date '2026-10-24' from perfiles where activo
  on conflict (asociado_id, tipo) do nothing;

  select count(*) into n_aportes from aportes_unicos;
  if n_aportes <> 38 then
    raise exception 'Se esperaban 38 aportes (19 iniciales + 19 tecnológicos) y hay %', n_aportes;
  end if;

  -- 1b) Las solicitudes de prueba sin desembolsar se marcan como rechazadas (los votos no se pueden borrar).
  update prestamos set estado = 'rechazado' where estado in ('radicado', 'aprobado');

  -- 2) Préstamos vigentes (el 4x1000 lo asume el usuario, no se registra).
  for r in
    select * from (values
      ('%Mar_a Eugenia%Cu_squer%', 300000, date '2026-10-24', date '2026-10-25'),
      ('%Nubia%Guerrero%', 200000, date '2026-10-24', date '2026-10-25'),
      ('%Freddy%Yam%', 400000, date '2026-10-24', date '2026-10-25'),
      ('%Nicol_s%P_rez%', 200000, date '2026-10-25', date '2026-10-25'),
      ('%Paola%Cu_squer%', 500000, date '2026-10-27', date '2026-10-27'),
      ('%Mar_a Elena%Jojoa%', 200000, date '2026-10-27', date '2026-10-27')
    ) as t(patron, monto, solicitud, desembolso)
  loop
    select id into strict v_id from perfiles where nombre ilike r.patron; -- falla si hay 0 o más de 1

    insert into prestamos (asociado_id, monto, estado, radicado_en, desembolsado_en)
    values (v_id, r.monto, 'vigente', r.solicitud::timestamptz + time '12:00', r.desembolso)
    returning id into v_prestamo;

    insert into movimientos_prestamo (prestamo_id, tipo, monto, fecha)
    values (v_prestamo, 'desembolso', r.monto, r.desembolso);
  end loop;
end $$;

-- Verificación
select p.nombre, pr.monto, pr.estado, pr.desembolsado_en
from prestamos pr join perfiles p on p.id = pr.asociado_id
order by pr.desembolsado_en, p.nombre;
select caja_disponible() as caja_prestable;  -- esperado: 1.900.000 - 1.800.000 = 100.000 (el tecnológico no se presta)
select tipo, count(*), sum(monto) from aportes_unicos group by tipo;  -- inicial 19 / 1.900.000; tecnologico 19 / 380.000
