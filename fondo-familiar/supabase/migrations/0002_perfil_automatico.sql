-- Crea la fila de perfiles cuando se crea un usuario en Supabase Auth.
-- Todos nacen como 'asociado'; el rol de administrador se asigna a mano (ver abajo).
create function crear_perfil_nuevo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into perfiles (id, nombre, correo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email
  );
  return new;
end $$;

create trigger al_crear_usuario
after insert on auth.users
for each row execute function crear_perfil_nuevo_usuario();

-- Si ya creaste usuarios antes de esta migración, genera sus perfiles:
insert into perfiles (id, nombre, correo)
select id, coalesce(raw_user_meta_data->>'nombre', split_part(email, '@', 1)), email
from auth.users
on conflict (id) do nothing;

-- Asignar rol de administrador (ejecutar con el correo real):
-- update perfiles set rol = 'fiscal' where correo = 'tu-correo@ejemplo.com';
-- (roles admin: 'fiscal', 'tesorero', 'contador')
