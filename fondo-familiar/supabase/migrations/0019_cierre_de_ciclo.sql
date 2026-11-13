-- Interruptor de cierre de ciclo: 1 = ciclo cerrado (no se piden ni se desembolsan préstamos nuevos).
insert into parametros (clave, valor, descripcion)
values ('ciclo_cerrado', 0, 'Cierre de ciclo: 1 = cerrado, bloquea préstamos nuevos')
on conflict (clave) do nothing;
