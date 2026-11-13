-- Bandeja de avisos dentro de la app: cada notificación también queda guardada aquí,
-- así se ve en cualquier dispositivo aunque no soporte notificaciones push.
create table if not exists avisos (
  id uuid primary key default gen_random_uuid(),
  asociado_id uuid not null references perfiles on delete cascade,
  titulo text not null,
  cuerpo text not null,
  url text,
  leido boolean not null default false,
  creado_en timestamptz not null default now()
);
create index if not exists avisos_asociado_idx on avisos (asociado_id, creado_en desc);

alter table avisos enable row level security;
create policy avisos_ver on avisos for select using (asociado_id = auth.uid());
create policy avisos_marcar on avisos for update using (asociado_id = auth.uid()) with check (asociado_id = auth.uid());
-- Los avisos los crea solo el servidor (clave de servicio).
