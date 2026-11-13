-- 4x1000: los préstamos desembolsados desde ahora pagan el 4x1000 con la primera cuota de interés.
-- Los préstamos ya existentes (cargados del Excel) quedan en false: el 4x1000 lo asumió el fondo.
alter table prestamos add column if not exists cobrar_4x1000 boolean not null default false;

-- El reembolso del 4x1000 es un movimiento aparte: NO suma a la caja prestable ni a las utilidades.
alter type tipo_mov_prestamo add value if not exists 'reembolso_4x1000';
alter table pagos_prestamo add column if not exists monto_4x1000 bigint not null default 0 check (monto_4x1000 >= 0);
alter table pagos_prestamo drop constraint if exists pagos_prestamo_check;
alter table pagos_prestamo add check (monto_interes + monto_4x1000 + monto_mora + monto_capital > 0);

-- Al aprobar un pago se registra también el reembolso del 4x1000.
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
  if pg.monto_4x1000 > 0 then
    insert into movimientos_prestamo (prestamo_id, tipo, monto, fecha, registrado_por)
    values (pg.prestamo_id, 'reembolso_4x1000', pg.monto_4x1000, hoy, auth.uid());
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

-- Saldo esperado en NU: el banco cobra el 4x1000 (0,4 %) al desembolsar y el deudor lo reembolsa en su primera cuota.
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
                where tipo in ('interes', 'interes_mora', 'abono_capital', 'reembolso_4x1000') and fecha <= hasta), 0)
    + coalesce((select sum(monto) from multas where pagada and pagada_en <= hasta), 0)
    - coalesce((select sum(monto) from movimientos_prestamo where tipo = 'desembolso' and fecha <= hasta), 0)
    - coalesce((select sum(round(m.monto * 0.004)) from movimientos_prestamo m
                join prestamos p on p.id = m.prestamo_id
                where m.tipo = 'desembolso' and p.cobrar_4x1000 and m.fecha <= hasta), 0)
    - coalesce((select sum(j.premios) from juegos j join reuniones r on r.id = j.reunion_id where r.fecha <= hasta), 0)
  )::bigint;
end $$;

-- Suscripciones de notificaciones push (una por dispositivo/navegador).
create table if not exists push_suscripciones (
  id uuid primary key default gen_random_uuid(),
  asociado_id uuid not null references perfiles on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  creada_en timestamptz not null default now()
);
alter table push_suscripciones enable row level security;
create policy push_propias on push_suscripciones for all
  using (asociado_id = auth.uid()) with check (asociado_id = auth.uid());
