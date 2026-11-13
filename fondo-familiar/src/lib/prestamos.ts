import "server-only";

export type Movimiento = { tipo: string; monto: number | string; fecha: string };

export type Parametros = { interes: number; mora: number };

// 4x1000 (GMF): 0,4 % del capital desembolsado. Lo paga el deudor una sola vez, junto con la primera cuota de interés.
export const PORCENTAJE_4X1000 = 0.4;

const diasDelMes = (anio: number, mes: number) => new Date(Date.UTC(anio, mes, 0)).getUTCDate();

// Lo que falta por reembolsar del 4x1000 de un préstamo (0 si no lo cobra o ya lo pagó).
export function gmfPorPagar(cobra4x1000: boolean, movimientos: Movimiento[]) {
  if (!cobra4x1000) return 0;
  const suma = (tipo: string) => movimientos.filter((m) => m.tipo === tipo).reduce((s, m) => s + Number(m.monto), 0);
  const total = Math.round((suma("desembolso") * PORCENTAJE_4X1000) / 100);
  return Math.max(0, total - suma("reembolso_4x1000"));
}

// Suma `meses` a una fecha ISO conservando el día del mes (si el mes no tiene ese día, usa el último).
export function sumarMeses(iso: string, meses: number) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const total = a * 12 + (m - 1) + meses;
  const anio = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const dia = Math.min(d, diasDelMes(anio, mes));
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

// Cuentas de un préstamo. El interés es fijo sobre el capital inicial y vence cada mes, el mismo día del desembolso
// (el día que se habilita el préstamo). La mora (provisional) es un % mensual sobre cada interés vencido y no pagado,
// por cada mes transcurrido desde su vencimiento. Si `cobra4x1000` es true, la primera cuota incluye el 4x1000.
export function cuentasPrestamo(
  desembolsadoEn: string | null,
  movimientos: Movimiento[],
  hoy: string,
  p: Parametros,
  cobra4x1000 = false,
) {
  const suma = (tipo: string) =>
    movimientos.filter((m) => m.tipo === tipo).reduce((s, m) => s + Number(m.monto), 0);

  const capitalInicial = suma("desembolso");
  const saldoCapital = capitalInicial - suma("abono_capital");
  const interesMensual = Math.round((capitalInicial * p.interes) / 100);
  const cuatroPorMil = cobra4x1000 ? Math.round((capitalInicial * PORCENTAJE_4X1000) / 100) : 0;
  const interesPagado = suma("interes");
  const gmfPagado = suma("reembolso_4x1000");
  const moraPagada = suma("interes_mora");

  // Fechas de pago ya llegadas (mensuales, mismo día del desembolso).
  const vencimientos: string[] = [];
  if (desembolsadoEn) {
    for (let k = 1; k < 600; k++) {
      const f = sumarMeses(desembolsadoEn, k);
      if (f > hoy) break;
      vencimientos.push(f);
    }
  }
  // Próxima fecha de pago: la de hoy si hoy es día de pago, si no la siguiente.
  let proximoPago: string | null = null;
  if (desembolsadoEn) {
    for (let k = 1; k < 600; k++) {
      const f = sumarMeses(desembolsadoEn, k);
      if (f >= hoy) {
        proximoPago = f;
        break;
      }
    }
  }

  // El interés se sigue causando mientras quede capital.
  const n = vencimientos.length;
  const causado = saldoCapital > 0 || interesPagado === 0 ? n * interesMensual : interesPagado;
  const interesSoloPendiente = Math.max(0, causado - interesPagado);
  // El 4x1000 se reembolsa con la primera cuota: se debe desde ese vencimiento y se paga primero.
  const gmfPendiente = Math.max(0, cuatroPorMil - gmfPagado);
  const gmfVencido = n > 0 ? gmfPendiente : 0;
  // `interesPendiente` es lo que debe en total por la cuota de interés (interés + 4x1000 vencido).
  const interesPendiente = interesSoloPendiente + gmfVencido;
  // Lo que se paga en la próxima cuota si no hay nada atrasado (la primera lleva el 4x1000).
  const interesProximo = interesMensual + (n === 0 ? gmfPendiente : 0);

  let moraCausada = 0;
  let porCubrir = interesPagado;
  vencimientos.forEach((_, i) => {
    const cubierto = Math.min(interesMensual, porCubrir);
    porCubrir -= cubierto;
    const impago = interesMensual - cubierto;
    const mesesDeRetraso = n - 1 - i;
    moraCausada += Math.round((impago * p.mora * mesesDeRetraso) / 100);
  });
  const moraPendiente = Math.max(0, moraCausada - moraPagada);

  return {
    capitalInicial,
    saldoCapital,
    interesMensual,
    cuatroPorMil,
    gmfPendiente,
    gmfPagado,
    interesSoloPendiente,
    interesPagado,
    interesPendiente,
    interesProximo,
    moraPendiente,
    proximoPago,
    ultimoVencimiento: vencimientos[n - 1] ?? null,
    primeraCuotaPendiente: gmfPendiente > 0,
  };
}
