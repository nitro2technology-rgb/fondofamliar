-- Primer ingreso solo con celular.
-- Cada asociado se identifica por su celular hasta completar su cuenta (correo real + contraseña propia).
alter table perfiles
  add column celular text unique check (celular is null or celular ~ '^3[0-9]{9}$'),
  add column primer_ingreso_completo boolean not null default false;
