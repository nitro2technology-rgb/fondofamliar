-- Todo lo que está en la cuenta Nu se presta; las utilidades se reparten al final del ciclo.
-- Por eso la caja disponible ahora incluye también lo que sobra de los juegos (recaudado menos
-- premios y su 4x1000) y las multas cobradas. La cadena no entra: se paga directo al receptor.
create or replace function caja_disponible() returns bigint
language sql stable security definer set search_path = public as $$
  select (
    coalesce((select sum(ahorro + juegos) from cuotas where estado = 'pagada'), 0)
    + coalesce((select sum(monto) from aportes_unicos where tipo = 'inicial'), 0)
    + coalesce((select sum(monto) from movimientos_prestamo where tipo in ('interes', 'interes_mora', 'abono_capital', 'reembolso_4x1000')), 0)
    + coalesce((select sum(monto) from multas where pagada), 0)
    - coalesce((select sum(monto) from movimientos_prestamo where tipo = 'desembolso'), 0)
    - coalesce((select sum(round(m.monto * 0.004)) from movimientos_prestamo m
                join prestamos p on p.id = m.prestamo_id
                where m.tipo = 'desembolso' and p.cobrar_4x1000), 0)
    - coalesce((select sum(monto + round(monto * 0.004)) from premios_bingo), 0)
    - coalesce((select sum(monto + round(monto * 0.004)) from prestamos where estado = 'aprobado'), 0)
  )::bigint;
$$;
