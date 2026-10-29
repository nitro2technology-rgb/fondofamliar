-- Cuenta o llave donde cada asociado recibe sus pagos (la cadena cuando le toca el turno).
alter table perfiles add column if not exists cuenta_pago text;

-- Datos del beneficiario de la cadena de un mes. Los asociados no pueden leer perfiles ajenos,
-- así que esta función entrega solo el nombre y la cuenta de quien tiene el turno ese mes,
-- y solo a quien tiene cuota en ese mes (o a un administrador).
create or replace function beneficiario_cadena(p_periodo date)
returns table (nombre text, cuenta_pago text)
language sql stable security definer set search_path = public as $$
  select coalesce(p.nombre, t.nombre_listado), p.cuenta_pago
  from cadena_turnos t
  left join perfiles p on p.id = t.asociado_id
  where date_trunc('month', t.fecha_reunion) = date_trunc('month', p_periodo::timestamp)
    and (
      es_admin()
      or exists (
        select 1 from cuotas c
        where c.asociado_id = auth.uid() and date_trunc('month', c.periodo::timestamp) = date_trunc('month', p_periodo::timestamp)
      )
    );
$$;

revoke all on function beneficiario_cadena(date) from public;
grant execute on function beneficiario_cadena(date) to authenticated;
