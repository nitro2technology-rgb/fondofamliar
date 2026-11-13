-- Pagos en efectivo / de varias personas con un solo comprobante:
-- descripción libre del directivo (p. ej. «Pago dividido en 5») y quién recolectó el dinero.
alter table pagos_reportados add column if not exists descripcion text;
alter table pagos_reportados add column if not exists recolector_id uuid references perfiles;
