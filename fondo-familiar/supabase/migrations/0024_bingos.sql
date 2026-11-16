-- Juegos = bingos. De cada cuota se recaudan $3.000 para los bingos; en cada reunión se juegan 3 bingos
-- y a cada ganador se le pagan $9.500 (con comprobante). Lo que sobre del recaudo se queda en el fondo.
insert into parametros (clave, valor, descripcion) values
  ('bingos_por_reunion', 3, 'Cantidad de bingos que se juegan en cada reunión'),
  ('premio_bingo', 9500, 'Premio que se paga a cada ganador de bingo')
on conflict (clave) do nothing;

update parametros
set descripcion = 'Parte de la cuota mensual para los bingos (el resto después de los premios queda en el fondo)'
where clave = 'cuota_juegos';

-- Premios pagados a los ganadores de cada reunión, con el comprobante de la transferencia.
create table if not exists premios_bingo (
  id uuid primary key default gen_random_uuid(),
  reunion_id uuid not null references reuniones on delete cascade,
  ganador_id uuid not null references perfiles,
  monto bigint not null check (monto > 0),
  ruta_comprobante text,
  registrado_por uuid references perfiles,
  creado_en timestamptz not null default now()
);
alter table premios_bingo enable row level security;
create policy premios_bingo_admin on premios_bingo for all using (es_admin()) with check (es_admin());

-- Saldo esperado en NU: los premios pagados ahora salen de premios_bingo (la tabla `juegos` queda en desuso).
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
    - coalesce((select sum(b.monto) from premios_bingo b join reuniones r on r.id = b.reunion_id where r.fecha <= hasta), 0)
  )::bigint;
end $$;
