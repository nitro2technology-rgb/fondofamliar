-- Foto de perfil (opcional) y sección «Recuerdos» (hasta 5 fotos por persona en cada reunión).

alter table perfiles add column if not exists foto_ruta text;

-- Buckets: las fotos de perfil se muestran como avatar (lectura pública con ruta no adivinable);
-- los recuerdos son privados y se ven con enlaces firmados temporales.
insert into storage.buckets (id, name, public) values ('fotos-perfil', 'fotos-perfil', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('recuerdos', 'recuerdos', false) on conflict (id) do nothing;

create policy fotos_perfil_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos-perfil' and (storage.foldername(name))[1] = auth.uid()::text);
create policy fotos_perfil_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'fotos-perfil' and (storage.foldername(name))[1] = auth.uid()::text);

create policy recuerdos_subir on storage.objects for insert to authenticated
  with check (bucket_id = 'recuerdos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy recuerdos_ver on storage.objects for select to authenticated
  using (bucket_id = 'recuerdos');
create policy recuerdos_borrar on storage.objects for delete to authenticated
  using (bucket_id = 'recuerdos' and (es_admin() or (storage.foldername(name))[1] = auth.uid()::text));

create table recuerdos (
  id uuid primary key default gen_random_uuid(),
  reunion_id uuid not null references reuniones on delete cascade,
  asociado_id uuid not null references perfiles on delete cascade,
  ruta text not null,
  ruta_mini text not null,
  creado_en timestamptz not null default now()
);
create index recuerdos_reunion_idx on recuerdos (reunion_id);

alter table recuerdos enable row level security;
create policy recuerdos_ver on recuerdos for select to authenticated using (true);
create policy recuerdos_subir on recuerdos for insert to authenticated with check (asociado_id = auth.uid());
create policy recuerdos_borrar on recuerdos for delete to authenticated using (asociado_id = auth.uid() or es_admin());

-- Máximo 5 fotos por persona en cada reunión.
create or replace function limitar_recuerdos() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from recuerdos where reunion_id = new.reunion_id and asociado_id = new.asociado_id) >= 5 then
    raise exception 'Máximo 5 fotos por persona en cada reunión';
  end if;
  return new;
end $$;
create trigger recuerdos_limite before insert on recuerdos for each row execute function limitar_recuerdos();
