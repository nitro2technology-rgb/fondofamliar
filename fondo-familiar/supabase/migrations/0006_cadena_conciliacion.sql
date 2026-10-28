-- Semana 3 · entrega de la cadena y conciliación con la cuenta NU.

create table entregas_cadena (
  turno int primary key references cadena_turnos (turno),
  monto bigint not null check (monto >= 0),
  fecha_entrega date not null,
  registrado_por uuid references perfiles
);
alter table entregas_cadena enable row level security;
create policy entregas_admin on entregas_cadena for all using (es_admin()) with check (es_admin());
create policy entregas_ver on entregas_cadena for select using (
  exists (select 1 from cadena_turnos t where t.turno = entregas_cadena.turno and t.asociado_id = auth.uid())
);
create trigger aud_entregas after insert or update or delete on entregas_cadena for each row execute function auditar();

-- Para conciliar por fecha hay que saber cuándo se pagó cada multa.
alter table multas add column pagada_en date;
update multas set pagada_en = current_date where pagada and pagada_en is null;

-- Saldo que debería tener la cuenta NU a una fecha, según lo registrado en la app.
create or replace function saldo_calculado(hasta date) returns bigint
language plpgsql stable security definer set search_path = public as $$
begin
  if not es_admin() then
    raise exception 'Solo administradores';
  end if;
  return (
    coalesce((select sum(ahorro + cadena + juegos) from cuotas where estado = 'pagada' and fecha_pago <= hasta), 0)
    + coalesce((select sum(monto) from aportes_unicos where fecha_pago <= hasta), 0)
    + coalesce((select sum(monto) from movimientos_prestamo
                where tipo in ('interes', 'interes_mora', 'abono_capital') and fecha <= hasta), 0)
    + coalesce((select sum(monto) from multas where pagada and pagada_en <= hasta), 0)
    - coalesce((select sum(monto) from movimientos_prestamo where tipo = 'desembolso' and fecha <= hasta), 0)
    - coalesce((select sum(monto) from entregas_cadena where fecha_entrega <= hasta), 0)
    - coalesce((select sum(j.premios) from juegos j join reuniones r on r.id = j.reunion_id where r.fecha <= hasta), 0)
  )::bigint;
end $$;
