import { requerirAdmin } from "@/lib/auth";
import { datosCierre } from "@/lib/cierre";
import { fechaCorta, pesos } from "@/lib/format";
import { nuevoReporte, respuestaPdf } from "@/lib/pdf";

// Liquidación del ciclo: ahorro + parte igual de las utilidades por asociado.
export async function GET() {
  await requerirAdmin();
  const c = await datosCierre();

  const r = await nuevoReporte("Liquidacion del ciclo", `Corte al ${fechaCorta(c.hoy)} · ${c.filas.length} asociados`);

  r.seccion("Utilidades");
  r.linea("Intereses cobrados", pesos(c.utilidades.intereses));
  r.linea("Mora cobrada", pesos(c.utilidades.mora));
  r.linea("Multas pagadas", pesos(c.utilidades.multas));
  r.linea("Utilidad de juegos", pesos(c.utilidades.juegos));
  r.linea("Total utilidades", pesos(c.totalUtilidades));
  r.linea(`Parte de cada asociado (1/${c.filas.length})`, pesos(c.parte));

  if (c.pendientes.length) {
    r.seccion("Prestamos por cancelar");
    r.tabla(
      ["Asociado", "Capital", "Interes", "Mora"],
      c.pendientes.map((p) => [p.nombre, pesos(p.cuentas.saldoCapital), pesos(p.cuentas.interesPendiente), pesos(p.cuentas.moraPendiente)]),
      [200, 100, 100, 100],
      [false, true, true, true],
    );
    if (c.plazo) r.nota(`Plazo: hasta las ${c.plazo.horaLimite} del ${fechaCorta(c.ultima!)}.`);
  }

  r.seccion("Liquidacion por asociado");
  const filas = c.filas.map((f) => [f.nombre, pesos(f.ahorro), pesos(f.utilidad), pesos(f.total)]);
  filas.push(["Total", pesos(c.totalAhorro), pesos(c.parte * c.filas.length), pesos(c.totalLiquidar)]);
  r.tabla(["Asociado", "Ahorro", "Utilidad", "A recibir"], filas, [190, 110, 100, 100], [false, true, true, true], true);
  r.nota("Ahorro = cuotas pagadas + aporte inicial. Utilidades en partes iguales entre los asociados.");

  return respuestaPdf(await r.guardar(), `liquidacion-${c.hoy}.pdf`);
}
