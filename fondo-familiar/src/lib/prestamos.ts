import "server-only";

export type Movimiento = { tipo: string; monto: number | string; fecha: string };

export type Parametros = { interes: number; mora: number };

// Cuentas de un préstamo. El interés es fijo sobre el capital inicial y vence cada día de reunión
// posterior al desembolso. La mora (provisional) es un % mensual sobre cada interés vencido y no pagado,
// por cada reunión transcurrida desde su vencimiento.
export function cuentasPrestamo(
  desembolsadoEn: string | null,
  movimientos: Movimiento[],
  reuniones: string[],
  hoy: string,
  p: Parametros,
) {
  const suma = (tipo: string) =>
    movimientos.filter((m) => m.tipo === tipo).reduce((s, m) => s + Number(m.monto), 0);

  const capitalInicial = suma("desembolso");
  const saldoCapital = capitalInicial - suma("abono_capital");
  const interesMensual = Math.round((capitalInicial * p.interes) / 100);
  const interesPagado = suma("interes");
  const moraPagada = suma("interes_mora");

  const vencimientos = desembolsadoEn ? reuniones.filter((f) => f > desembolsadoEn && f <= hoy).sort() : [];
  // El interés se sigue causando mientras quede capital.
  const causado = saldoCapital > 0 || interesPagado === 0 ? vencimientos.length * interesMensual : interesPagado;
  const interesPendiente = Math.max(0, causado - interesPagado);

  let moraCausada = 0;
  let porCubrir = interesPagado;
  vencimientos.forEach((_, i) => {
    const cubierto = Math.min(interesMensual, porCubrir);
    porCubrir -= cubierto;
    const impago = interesMensual - cubierto;
    const mesesDeRetraso = vencimientos.length - 1 - i;
    moraCausada += Math.round((impago * p.mora * mesesDeRetraso) / 100);
  });
  const moraPendiente = Math.max(0, moraCausada - moraPagada);

  return { capitalInicial, saldoCapital, interesMensual, interesPagado, interesPendiente, moraPendiente };
}
