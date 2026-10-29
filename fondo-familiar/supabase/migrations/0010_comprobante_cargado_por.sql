-- Quién cargó el comprobante: el propio asociado o un administrador que lo subió por él.
alter table pagos_reportados add column if not exists subido_por uuid references perfiles;
update pagos_reportados set subido_por = asociado_id where subido_por is null;
