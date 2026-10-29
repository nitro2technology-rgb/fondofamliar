-- La cadena se paga directamente a quien tiene el turno: no entra a la cuenta NU del fondo.
-- El saldo esperado de la cuenta ya no cuenta la cadena ni descuenta entregas de cadena.
create or replace function saldo_calculado(hasta date) returns bigint
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_admin() then
    raise exception 'Solo administradores';
  end if;
  return (
    coalesce((select sum(ahorro + juegos) from cuotas where estado = 'pagada' and fecha_pago <= hasta), 0)
    + coalesce((select sum(monto) from aportes_unicos where fecha_pago <= hasta), 0)
    + coalesce((select sum(monto) from movimientos_prestamo
                where tipo in ('interes', 'interes_mora', 'abono_capital') and fecha <= hasta), 0)
    + coalesce((select sum(monto) from multas where pagada and pagada_en <= hasta), 0)
    - coalesce((select sum(monto) from movimientos_prestamo where tipo = 'desembolso' and fecha <= hasta), 0)
    - coalesce((select sum(j.premios) from juegos j join reuniones r on r.id = j.reunion_id where r.fecha <= hasta), 0)
  )::bigint;
end $$;
