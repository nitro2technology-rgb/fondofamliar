-- Semana 3 · préstamos: caja disponible, cola, votación 2 de 3.

-- Caja que se puede prestar (provisional): ahorro de cuotas pagadas + aportes iniciales
-- + intereses y abonos recibidos − desembolsos − préstamos aprobados aún sin desembolsar.
-- La cadena y los juegos pasan por el fondo pero no se prestan.
create or replace function caja_disponible() returns bigint
language sql stable security definer set search_path = public as $$
  select (
    coalesce((select sum(ahorro) from cuotas where estado = 'pagada'), 0)
    + coalesce((select sum(monto) from aportes_unicos where tipo = 'inicial'), 0)
    + coalesce((select sum(monto) from movimientos_prestamo where tipo in ('interes', 'interes_mora', 'abono_capital')), 0)
    - coalesce((select sum(monto) from movimientos_prestamo where tipo = 'desembolso'), 0)
    - coalesce((select sum(monto) from prestamos where estado = 'aprobado'), 0)
  )::bigint;
$$;

-- Posición en la cola (1 = siguiente) para solicitudes radicadas o aprobadas sin desembolsar.
create or replace function posicion_cola(p_prestamo uuid) returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int + 1
  from prestamos o, prestamos p
  where p.id = p_prestamo
    and o.estado in ('radicado', 'aprobado')
    and o.radicado_en < p.radicado_en;
$$;

-- Con 2 votos iguales se decide la solicitud.
create or replace function resolver_votacion() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a int;
  r int;
begin
  select count(*) filter (where voto = 'aprobar'), count(*) filter (where voto = 'rechazar')
    into a, r from votos_prestamo where prestamo_id = new.prestamo_id;
  if a >= 2 then
    update prestamos set estado = 'aprobado' where id = new.prestamo_id and estado = 'radicado';
  elsif r >= 2 then
    update prestamos set estado = 'rechazado' where id = new.prestamo_id and estado = 'radicado';
  end if;
  return new;
end $$;

create trigger resolver_votacion after insert on votos_prestamo
  for each row execute function resolver_votacion();

-- Los votos no se cambian ni se borran.
create trigger voto_inmutable before update or delete on votos_prestamo
  for each row execute function bloquear_cambios();

-- Quien apadrina ve el externo y su padrino lo crea al radicar (se hace desde el servidor).
-- Un asociado no puede tener dos solicitudes o préstamos en curso.
create unique index un_prestamo_en_curso on prestamos (asociado_id)
  where estado in ('radicado', 'aprobado', 'vigente');
