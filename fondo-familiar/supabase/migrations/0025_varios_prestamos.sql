-- Varios préstamos a la vez por asociado: cada uno con su propia fecha de pago (día del desembolso).
-- El límite pasa a ser el tope ($1.000.000) sobre lo que se debe en total (capital en préstamos
-- vigentes + solicitudes radicadas/aprobadas); se valida en el servidor.
drop index if exists un_prestamo_en_curso;
