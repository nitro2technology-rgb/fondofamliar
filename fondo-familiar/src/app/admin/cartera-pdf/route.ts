import { requerirAdmin } from "@/lib/auth";
import { carteraVigente } from "@/lib/cartera";
import { fechaCorta, hoyColombia, pesos } from "@/lib/format";
import { nuevoReporte, respuestaPdf } from "@/lib/pdf";

// Cartera de préstamos vigentes: capital, interés y mora pendientes por asociado.
export async function GET() {
  await requerirAdmin();
  const hoy = hoyColombia();
  const cartera = (await carteraVigente(hoy)).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const r = await nuevoReporte("Cartera de prestamos", `Al ${fechaCorta(hoy)} · ${cartera.length} prestamos vigentes`);
  const suma = (f: (c: (typeof cartera)[number]) => number) => cartera.reduce((s, c) => s + f(c), 0);
  const enMora = cartera.filter((c) => c.cuentas.moraPendiente > 0);

  r.seccion("Resumen");
  r.linea("Capital prestado (inicial)", pesos(suma((c) => c.cuentas.capitalInicial)));
  r.linea("Saldo de capital", pesos(suma((c) => c.cuentas.saldoCapital)));
  r.linea("Interes pendiente", pesos(suma((c) => c.cuentas.interesPendiente)));
  r.linea("Mora estimada", pesos(suma((c) => c.cuentas.moraPendiente)));
  r.linea("Prestamos con mora", String(enMora.length));

  r.seccion("Detalle por asociado");
  const filas = cartera.map((c) => [
    c.nombre,
    pesos(c.cuentas.saldoCapital),
    pesos(c.cuentas.interesMensual),
    pesos(c.cuentas.interesPendiente),
    pesos(c.cuentas.moraPendiente),
    c.cuentas.moraPendiente > 0 ? "En mora" : c.cuentas.interesPendiente > 0 ? "Debe interes" : "Al dia",
  ]);
  filas.push(["Total", pesos(suma((c) => c.cuentas.saldoCapital)), pesos(suma((c) => c.cuentas.interesMensual)), pesos(suma((c) => c.cuentas.interesPendiente)), pesos(suma((c) => c.cuentas.moraPendiente)), ""]);
  r.tabla(["Asociado", "Saldo capital", "Interes mes", "Int. pendiente", "Mora", "Estado"], filas, [140, 80, 70, 80, 60, 65], [false, true, true, true, true, false], true);
  r.nota("Mora calculada con la formula provisional (4% mensual sobre cada interes vencido y no pagado).");

  return respuestaPdf(await r.guardar(), `cartera-${hoy}.pdf`);
}
