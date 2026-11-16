-- El aporte tecnológico fue un extra de cada asociado para el desarrollador de la app:
-- nunca estuvo en la cuenta Nu ni hizo parte del fondo. El saldo esperado en Nu solo cuenta el aporte inicial.
-- Además, Nu cobra el 4x1000 al transferir cada premio de bingo: se resta junto con el premio.
create or replace function saldo_calculado(hasta date) returns bigint
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_admin() then
    raise exception 'Solo administradores';
  end if;
  return (
    coalesce((select sum(ahorro + juegos) from cuotas where estado = 'pagada' and fecha_pago <= hasta), 0)
    + coalesce((select sum(monto) from aportes_unicos where tipo = 'inicial' and fecha_pago <= hasta), 0)
    + coalesce((select sum(monto) from movimientos_prestamo
                where tipo in ('interes', 'interes_mora', 'abono_capital', 'reembolso_4x1000') and fecha <= hasta), 0)
    + coalesce((select sum(monto) from multas where pagada and pagada_en <= hasta), 0)
    - coalesce((select sum(monto) from movimientos_prestamo where tipo = 'desembolso' and fecha <= hasta), 0)
    - coalesce((select sum(round(m.monto * 0.004)) from movimientos_prestamo m
                join prestamos p on p.id = m.prestamo_id
                where m.tipo = 'desembolso' and p.cobrar_4x1000 and m.fecha <= hasta), 0)
    - coalesce((select sum(b.monto + round(b.monto * 0.004)) from premios_bingo b join reuniones r on r.id = b.reunion_id where r.fecha <= hasta), 0)
  )::bigint;
end $$;
