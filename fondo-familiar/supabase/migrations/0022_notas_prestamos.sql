-- Descripción opcional de cada voto (aprobar / rechazar) y nota interna del préstamo.
alter table votos_prestamo add column if not exists comentario text;
alter table prestamos add column if not exists nota text;
