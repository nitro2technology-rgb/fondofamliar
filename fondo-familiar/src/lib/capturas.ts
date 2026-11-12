// Meses en que se sube la captura de la cuenta NU: octubre de 2026 (antes de la primera reunión) y cada ronda
// del ciclo. Se puede subir por adelantado; `hasta` limita a las rondas cuya reunión ya llegó.
export function mesesDeCaptura(turnos: { fecha_reunion: string; turno?: number }[], hasta?: string) {
  const meses: { mes: string; reunion: string | null; ronda: number | null }[] = [{ mes: "2026-10", reunion: null, ronda: null }];
  for (const t of [...turnos].sort((a, b) => a.fecha_reunion.localeCompare(b.fecha_reunion))) {
    if (t.fecha_reunion.slice(0, 7) > "2026-10" && (!hasta || t.fecha_reunion <= hasta)) {
      meses.push({ mes: t.fecha_reunion.slice(0, 7), reunion: t.fecha_reunion, ronda: t.turno ?? null });
    }
  }
  return meses; // cronológico
}
