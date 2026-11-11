-- Pagos de préstamo reportados por el asociado (interés, mora y/o abono a capital) con comprobante.
-- Un administrador los aprueba; al aprobar se crean los movimientos del préstamo (que son de solo inserción)
-- y, si el capital llega a cero, el préstamo pasa a "pagado" y el asociado queda libre para pedir otro.

create table pagos_prestamo (
  id uuid primary key default gen_random_uuid(),
  prestamo_id uuid not null references prestamos,
  asociado_id uuid not null references perfiles,
  monto_interes bigint not null default 0 check (monto_interes >= 0),
  monto_mora bigint not null default 0 check (monto_mora >= 0),
  monto_capital bigint not null default 0 check (monto_capital >= 0),
  ruta_archivo text not null,
  subido_por uuid references perfiles,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  nota text,
  creado_en timestamptz not null default now(),
  revisado_por uuid references perfiles,
  revisado_en timestamptz,
  check (monto_interes + monto_mora + monto_capital > 0)
);

alter table pagos_prestamo enable row level security;

create policy pagos_prestamo_ver on pagos_prestamo for select using (asociado_id = auth.uid() or es_admin());
create policy pagos_prestamo_reportar on pagos_prestamo for insert
  with check (asociado_id = auth.uid() and estado = 'pendiente');
-- Solo los administradores cambian el estado (rechazar); aprobar se hace con la función de abajo.
create policy pagos_prestamo_admin on pagos_prestamo for all using (es_admin()) with check (es_admin());

create trigger aud_pagos_prestamo after insert or update or delete on pagos_prestamo
  for each row execute function auditar();

-- Aprueba un pago: crea los movimientos y cierra el préstamo si ya no queda capital.
-- Devuelve 'ok' o el motivo por el que no se pudo aprobar (sin cambiar nada).
create or replace function aprobar_pago_prestamo(p_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare
  pg pagos_prestamo;
  saldo bigint;
  hoy date := (now() at time zone 'America/Bogota')::date;
begin
  if not es_admin() then
    return 'Solo los administradores pueden aprobar pagos.';
  end if;

  select * into pg from pagos_prestamo where id = p_id for update;
  if not found then return 'El pago ya no existe.'; end if;
  if pg.estado <> 'pendiente' then return 'Este pago ya fue revisado.'; end if;

  select coalesce(sum(case tipo when 'desembolso' then monto when 'abono_capital' then -monto else 0 end), 0)
    into saldo from movimientos_prestamo where prestamo_id = pg.prestamo_id;
  if pg.monto_capital > saldo then
    return 'El abono a capital supera el saldo actual del préstamo.';
  end if;

  if pg.monto_interes > 0 then
    insert into movimientos_prestamo (prestamo_id, tipo, monto, fecha, registrado_por)
    values (pg.prestamo_id, 'interes', pg.monto_interes, hoy, auth.uid());
  end if;
  if pg.monto_mora > 0 then
    insert into movimientos_prestamo (prestamo_id, tipo, monto, fecha, registrado_por)
    values (pg.prestamo_id, 'interes_mora', pg.monto_mora, hoy, auth.uid());
  end if;
  if pg.monto_capital > 0 then
    insert into movimientos_prestamo (prestamo_id, tipo, monto, fecha, registrado_por)
    values (pg.prestamo_id, 'abono_capital', pg.monto_capital, hoy, auth.uid());
    if pg.monto_capital = saldo then
      update prestamos set estado = 'pagado' where id = pg.prestamo_id;
    end if;
  end if;

  update pagos_prestamo set estado = 'aprobado', revisado_por = auth.uid(), revisado_en = now() where id = p_id;
  return 'ok';
end $$;

revoke all on function aprobar_pago_prestamo(uuid) from public;
grant execute on function aprobar_pago_prestamo(uuid) to authenticated;
