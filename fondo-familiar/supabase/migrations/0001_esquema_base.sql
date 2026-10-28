-- Fondo Familiar · esquema base (semana 1)
-- Montos en pesos colombianos enteros (bigint). Movimientos financieros: solo insertar, nunca editar.

create extension if not exists pgcrypto;

-- ───────── Tipos ─────────
create type rol_usuario as enum ('asociado', 'tesorero', 'contador', 'fiscal');
create type estado_cuota as enum ('pendiente', 'pagada', 'en_mora');
create type estado_prestamo as enum ('radicado', 'aprobado', 'rechazado', 'vigente', 'pagado');
create type voto_tipo as enum ('aprobar', 'rechazar');
create type tipo_mov_prestamo as enum ('desembolso', 'interes', 'abono_capital', 'interes_mora');
create type estado_asistencia as enum ('puntual', 'tarde', 'ausente', 'justificada');

-- ───────── Perfiles (1:1 con auth.users). Los 19 integrantes son asociados; 3 de ellos son admins. ─────────
create table perfiles (
  id uuid primary key references auth.users on delete cascade,
  nombre text not null,
  correo text not null unique,
  rol rol_usuario not null default 'asociado',
  ciudad text,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create table parametros (
  clave text primary key,
  valor numeric not null,
  descripcion text
);
insert into parametros (clave, valor, descripcion) values
  ('aporte_tecnologico', 20000, 'Aporte único para el desarrollo de la app'),
  ('aporte_inicial', 100000, 'Aporte inicial al fondo'),
  ('cuota_ahorro', 40000, 'Parte de la cuota mensual destinada a ahorro'),
  ('cuota_cadena', 40000, 'Parte de la cuota mensual destinada a la cadena'),
  ('cuota_juegos', 3000, 'Parte de la cuota mensual para juegos (50% premios, 50% utilidad)'),
  ('tope_prestamo', 1000000, 'Tope acumulado asociado + externo apadrinado'),
  ('interes_prestamo_pct', 4, 'Interés mensual fijo sobre el capital inicial'),
  ('interes_mora_pct', 4, 'Provisional: interés mensual sobre el interés no pagado'),
  ('multa_tarde', 5000, 'Retraso a la reunión'),
  ('multa_ausencia', 8000, 'Inasistencia injustificada (residentes en Pasto)');

-- ───────── Funciones de rol (security definer para evitar recursión en RLS) ─────────
create function es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from perfiles
    where id = auth.uid() and activo and rol in ('tesorero', 'contador', 'fiscal')
  );
$$;

-- ───────── Cadena ─────────
create table cadena_turnos (
  id serial primary key,
  asociado_id uuid references perfiles on delete restrict,
  nombre_listado text not null,
  turno int not null unique check (turno between 1 and 19),
  fecha_reunion date not null
);

-- ───────── Cuotas y aportes ─────────
create table cuotas (
  id uuid primary key default gen_random_uuid(),
  asociado_id uuid not null references perfiles,
  periodo date not null,                       -- primer día del mes de la reunión
  ahorro bigint not null default 0,
  cadena bigint not null default 0,            -- 0 el mes en que le toca el turno
  juegos bigint not null default 0,
  estado estado_cuota not null default 'pendiente',
  fecha_pago date,
  registrado_por uuid references perfiles,
  unique (asociado_id, periodo)
);

create table aportes_unicos (
  id uuid primary key default gen_random_uuid(),
  asociado_id uuid not null references perfiles,
  tipo text not null check (tipo in ('inicial', 'tecnologico')),
  monto bigint not null,
  fecha_pago date not null,
  registrado_por uuid references perfiles,
  unique (asociado_id, tipo)
);

-- ───────── Préstamos ─────────
create table externos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  padrino_id uuid not null references perfiles
);

create table prestamos (
  id uuid primary key default gen_random_uuid(),
  asociado_id uuid not null references perfiles,        -- solicitante o padrino
  externo_id uuid references externos,
  monto bigint not null check (monto > 0),
  estado estado_prestamo not null default 'radicado',
  radicado_en timestamptz not null default now(),       -- orden de la cola
  desembolsado_en date
);

create table votos_prestamo (
  prestamo_id uuid not null references prestamos on delete cascade,
  admin_id uuid not null references perfiles,
  voto voto_tipo not null,
  votado_en timestamptz not null default now(),
  primary key (prestamo_id, admin_id)
);

create table movimientos_prestamo (
  id uuid primary key default gen_random_uuid(),
  prestamo_id uuid not null references prestamos,
  tipo tipo_mov_prestamo not null,
  monto bigint not null,
  periodo date,
  fecha date not null default current_date,
  registrado_por uuid references perfiles
);

-- ───────── Reuniones, asistencia, multas, juegos ─────────
create table reuniones (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  hora time not null default '19:30'
);

create table asistencias (
  reunion_id uuid not null references reuniones on delete cascade,
  asociado_id uuid not null references perfiles,
  estado estado_asistencia not null,
  primary key (reunion_id, asociado_id)
);

create table multas (
  id uuid primary key default gen_random_uuid(),
  asociado_id uuid not null references perfiles,
  reunion_id uuid references reuniones,
  motivo text not null,
  monto bigint not null,
  pagada boolean not null default false
);

create table juegos (
  id uuid primary key default gen_random_uuid(),
  reunion_id uuid not null references reuniones,
  recaudo bigint not null,
  premios bigint not null,
  utilidad bigint not null
);

create table capturas_cuenta (
  id uuid primary key default gen_random_uuid(),
  periodo date not null unique,
  ruta_archivo text not null,
  saldo_declarado bigint,
  subido_por uuid references perfiles,
  subido_en timestamptz not null default now()
);

-- ───────── Auditoría (solo inserción) ─────────
create table auditoria (
  id bigserial primary key,
  usuario_id uuid,
  accion text not null,
  tabla text not null,
  registro_id text,
  detalle jsonb,
  creado_en timestamptz not null default now()
);

create function auditar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into auditoria (usuario_id, accion, tabla, registro_id, detalle)
  values (auth.uid(), tg_op, tg_table_name,
          coalesce(to_jsonb(new)->>'id', to_jsonb(old)->>'id'),
          jsonb_build_object('antes', to_jsonb(old), 'despues', to_jsonb(new)));
  return coalesce(new, old);
end $$;

create trigger aud_cuotas after insert or update or delete on cuotas for each row execute function auditar();
create trigger aud_aportes after insert or update or delete on aportes_unicos for each row execute function auditar();
create trigger aud_prestamos after insert or update or delete on prestamos for each row execute function auditar();
create trigger aud_mov after insert or update or delete on movimientos_prestamo for each row execute function auditar();
create trigger aud_multas after insert or update or delete on multas for each row execute function auditar();

-- Los movimientos de préstamo no se editan ni borran: se corrigen con un contramovimiento.
create function bloquear_cambios() returns trigger
language plpgsql as $$
begin
  raise exception 'Esta tabla es de solo inserción';
end $$;
create trigger mov_inmutable before update or delete on movimientos_prestamo for each row execute function bloquear_cambios();
create trigger auditoria_inmutable before update or delete on auditoria for each row execute function bloquear_cambios();

-- ───────── Seguridad por fila (RLS) ─────────
alter table perfiles enable row level security;
alter table parametros enable row level security;
alter table cadena_turnos enable row level security;
alter table cuotas enable row level security;
alter table aportes_unicos enable row level security;
alter table externos enable row level security;
alter table prestamos enable row level security;
alter table votos_prestamo enable row level security;
alter table movimientos_prestamo enable row level security;
alter table reuniones enable row level security;
alter table asistencias enable row level security;
alter table multas enable row level security;
alter table juegos enable row level security;
alter table capturas_cuenta enable row level security;
alter table auditoria enable row level security;

-- Perfiles: cada uno ve el suyo; los admins ven y gestionan todos.
create policy perfiles_ver on perfiles for select using (id = auth.uid() or es_admin());
create policy perfiles_admin on perfiles for all using (es_admin()) with check (es_admin());

-- Parámetros y calendario de cadena/reuniones: lectura para cualquier usuario autenticado; escritura admin.
create policy parametros_leer on parametros for select to authenticated using (true);
create policy parametros_admin on parametros for all using (es_admin()) with check (es_admin());
create policy cadena_leer on cadena_turnos for select to authenticated using (true);
create policy cadena_admin on cadena_turnos for all using (es_admin()) with check (es_admin());
create policy reuniones_leer on reuniones for select to authenticated using (true);
create policy reuniones_admin on reuniones for all using (es_admin()) with check (es_admin());

-- Datos personales: el asociado solo ve lo suyo; los admins ven y registran todo.
create policy cuotas_ver on cuotas for select using (asociado_id = auth.uid() or es_admin());
create policy cuotas_admin on cuotas for all using (es_admin()) with check (es_admin());

create policy aportes_ver on aportes_unicos for select using (asociado_id = auth.uid() or es_admin());
create policy aportes_admin on aportes_unicos for all using (es_admin()) with check (es_admin());

create policy externos_ver on externos for select using (padrino_id = auth.uid() or es_admin());
create policy externos_admin on externos for all using (es_admin()) with check (es_admin());

create policy prestamos_ver on prestamos for select using (asociado_id = auth.uid() or es_admin());
create policy prestamos_radicar on prestamos for insert with check (asociado_id = auth.uid() and estado = 'radicado');
create policy prestamos_admin on prestamos for update using (es_admin()) with check (es_admin());

create policy votos_ver on votos_prestamo for select using (es_admin());
create policy votos_votar on votos_prestamo for insert with check (es_admin() and admin_id = auth.uid());

create policy mov_ver on movimientos_prestamo for select using (
  es_admin() or exists (select 1 from prestamos p where p.id = prestamo_id and p.asociado_id = auth.uid())
);
create policy mov_registrar on movimientos_prestamo for insert with check (es_admin());

create policy asist_ver on asistencias for select using (asociado_id = auth.uid() or es_admin());
create policy asist_admin on asistencias for all using (es_admin()) with check (es_admin());

create policy multas_ver on multas for select using (asociado_id = auth.uid() or es_admin());
create policy multas_admin on multas for all using (es_admin()) with check (es_admin());

create policy juegos_leer on juegos for select to authenticated using (true);
create policy juegos_admin on juegos for all using (es_admin()) with check (es_admin());

create policy capturas_leer on capturas_cuenta for select using (es_admin());
create policy capturas_admin on capturas_cuenta for all using (es_admin()) with check (es_admin());

create policy auditoria_ver on auditoria for select using (es_admin());
