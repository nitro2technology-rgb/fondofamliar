-- Respaldos semanales de la base (JSON comprimido). Bucket privado sin políticas:
-- solo lo usa el servidor con la clave de servicio.
insert into storage.buckets (id, name, public) values ('respaldos', 'respaldos', false) on conflict (id) do nothing;
