-- El banco (NU) cobra el 4x1000 al desembolsar un préstamo: ese dinero sale de la caja del fondo
-- hasta que el deudor lo reembolsa con su primera cuota de interés (movimiento 'reembolso_4x1000').
-- Así el valor "disponible para prestar" refleja el impuesto igual que el saldo esperado en NU.
-- Los aprobados sin desembolsar reservan también su 4x1000 (se cobrará al entregarlos).
create or replace function caja_disponible() returns bigint
language sql stable security definer set search_path = public as $$
  select (
    coalesce((select sum(ahorro) from cuotas where estado = 'pagada'), 0)
    + coalesce((select sum(monto) from aportes_unicos where tipo = 'inicial'), 0)
    + coalesce((select sum(monto) from movimientos_prestamo where tipo in ('interes', 'interes_mora', 'abono_capital', 'reembolso_4x1000')), 0)
    - coalesce((select sum(monto) from movimientos_prestamo where tipo = 'desembolso'), 0)
    - coalesce((select sum(round(m.monto * 0.004)) from movimientos_prestamo m
                join prestamos p on p.id = m.prestamo_id
                where m.tipo = 'desembolso' and p.cobrar_4x1000), 0)
    - coalesce((select sum(monto + round(monto * 0.004)) from prestamos where estado = 'aprobado'), 0)
  )::bigint;
$$;
