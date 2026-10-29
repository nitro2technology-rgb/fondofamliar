-- Pagos reportados por los asociados (con comprobante) que los administradores aprueban,
-- más una restricción para que una doble pulsación no duplique multas.

-- ───────── Multas: una por asociado y reunión ─────────
-- Se limpian duplicados previos (se conserva la pagada, o la más reciente) antes de crear el índice.
delete from multas a
using multas b
where a.reunion_id is not null
  and a.reunion_id = b.reunion_id
  and a.asociado_id = b.asociado_id
  and a.id <> b.id
  and ((b.pagada and not a.pagada) or (a.pagada = b.pagada and b.id > a.id));

create unique index if not exists multas_unica_por_reunion on multas (reunion_id, asociado_id);

-- ───────── Pagos reportados ─────────
create table pagos_reportados (
  id uuid primary key default gen_random_uuid(),
  cuota_id uuid not null references cuotas on delete cascade,
  asociado_id uuid not null references perfiles,
  tipo text not null check (tipo in ('fondo', 'cadena')),   -- fondo = ahorro + juegos; cadena = pago a quien tiene el turno
  monto bigint not null,
  ruta_archivo text not null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  nota text,
  creado_en timestamptz not null default now(),
  revisado_por uuid references perfiles,
  revisado_en timestamptz,
  unique (cuota_id, tipo)
);

alter table pagos_reportados enable row level security;

create policy pagos_ver on pagos_reportados for select using (asociado_id = auth.uid() or es_admin());
create policy pagos_reportar on pagos_reportados for insert
  with check (asociado_id = auth.uid() and estado = 'pendiente');
-- El asociado puede reenviar mientras no esté aprobado; siempre vuelve a quedar pendiente.
create policy pagos_reenviar on pagos_reportados for update
  using (asociado_id = auth.uid() and estado <> 'aprobado')
  with check (asociado_id = auth.uid() and estado = 'pendiente');
create policy pagos_admin on pagos_reportados for all using (es_admin()) with check (es_admin());

create trigger aud_pagos_reportados after insert or update or delete on pagos_reportados
  for each row execute function auditar();

-- ───────── Comprobantes de pago (archivos privados) ─────────
insert into storage.buckets (id, name, public)
values ('comprobantes-pago', 'comprobantes-pago', false)
on conflict (id) do nothing;

create policy comprobantes_leer on storage.objects for select
  using (bucket_id = 'comprobantes-pago' and (es_admin() or (storage.foldername(name))[1] = auth.uid()::text));
create policy comprobantes_subir on storage.objects for insert
  with check (bucket_id = 'comprobantes-pago' and (storage.foldername(name))[1] = auth.uid()::text);
create policy comprobantes_borrar on storage.objects for delete
  using (bucket_id = 'comprobantes-pago' and (es_admin() or (storage.foldername(name))[1] = auth.uid()::text));

-- Las capturas de la cuenta NU ahora se pueden eliminar (al corregir una subida errónea).
create policy capturas_nu_borrar on storage.objects for delete
  using (bucket_id = 'capturas-nu' and es_admin());
