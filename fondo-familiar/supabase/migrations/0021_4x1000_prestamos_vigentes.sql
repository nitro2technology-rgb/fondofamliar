-- Los préstamos vigentes cargados antes de la regla del 4x1000 (p. ej. los del Excel) también lo pagan
-- en su primera cuota: se reembolsa una sola vez, junto con el primer interés que se pague.
update prestamos set cobrar_4x1000 = true where estado = 'vigente' and cobrar_4x1000 = false;
