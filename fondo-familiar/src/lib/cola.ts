// Reparto de la caja entre las solicitudes en cola: la plata circula.
// Se recorre la cola por orden de radicación; a cada solicitud que alcance con lo que queda se le
// reserva su valor (más el 4x1000), y la que NO alcanza se salta sin bloquear a las siguientes.
// Así, con $150.000 en caja, una solicitud de $500.000 espera y una de $100.000 posterior sí se atiende.

export type ItemCola = { id: string; monto: number; estado: string; radicado_en: string };

export const costoConGmf = (monto: number) => monto + Math.round(monto * 0.004);

/**
 * @param cajaLibre resultado de caja_disponible(), que ya descuenta lo aprobado sin desembolsar.
 * @returns ids de las solicitudes (radicadas o aprobadas) que hoy sí alcanzan.
 */
export function solicitudesQueAlcanzan(cajaLibre: number, items: ItemCola[]): Set<string> {
  const enCola = items.filter((x) => x.estado === "radicado" || x.estado === "aprobado");
  // Se devuelve a la bolsa lo reservado por los aprobados para repartirlo de nuevo en orden.
  let restante = cajaLibre + enCola.filter((x) => x.estado === "aprobado").reduce((s, x) => s + costoConGmf(Number(x.monto)), 0);
  const alcanzan = new Set<string>();
  for (const x of [...enCola].sort((a, b) => a.radicado_en.localeCompare(b.radicado_en))) {
    const costo = costoConGmf(Number(x.monto));
    if (costo <= restante) {
      alcanzan.add(x.id);
      restante -= costo;
    }
  }
  return alcanzan;
}
