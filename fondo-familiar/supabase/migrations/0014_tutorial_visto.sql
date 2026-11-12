-- Recuerda quién ya vio el tutorial de bienvenida (uno por panel).
alter table perfiles add column if not exists tutorial_asociado boolean not null default false;
alter table perfiles add column if not exists tutorial_admin boolean not null default false;
