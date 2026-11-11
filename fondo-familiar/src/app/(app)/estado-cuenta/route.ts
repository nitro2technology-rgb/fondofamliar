import { esAdmin, requerirPerfil } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fechaCorta, hoyColombia, mesLargo, pesos } from "@/lib/format";
import { cuentasPrestamo } from "@/lib/prestamos";
import { nuevoReporte, respuestaPdf } from "@/lib/pdf";

// Estado de cuenta en PDF. Cada asociado descarga el suyo; los admins pueden pedir el de otro con ?id=.
export async function GET(request: Request) {
  const yo = await requerirPerfil();
  const pedido = new URL(request.url).searchParams.get("id");
  const objetivo = pedido && esAdmin(yo) ? pedido : yo.id;
  const supabase = await crearClienteServidor(); // RLS: el asociado solo ve lo suyo
  const hoy = hoyColombia();

  const [perfil, cuotas, turnos, aportes, multas, prestamo, params] = await Promise.all([
    supabase.from("perfiles").select("nombre, ciudad").eq("id", objetivo).maybeSingle(),
    supabase.from("cuotas").select("periodo, ahorro, cadena, juegos, estado").eq("asociado_id", objetivo).order("periodo"),
    supabase.from("cadena_turnos").select("asociado_id, turno, fecha_reunion").order("turno"),
    supabase.from("aportes_unicos").select("tipo, monto, fecha_pago").eq("asociado_id", objetivo),
    supabase.from("multas").select("monto").eq("asociado_id", objetivo).eq("pagada", false),
    supabase.from("prestamos").select("id, monto, desembolsado_en").eq("asociado_id", objetivo).eq("estado", "vigente").maybeSingle(),
    supabase.from("parametros").select("clave, valor").in("clave", ["interes_prestamo_pct", "interes_mora_pct"]),
  ]);
  if (!perfil.data) return new Response("No encontrado", { status: 404 });

  const lTurnos = turnos.data ?? [];
  const fechaDe = (periodo: string) => lTurnos.find((t) => t.fecha_reunion.slice(0, 7) === periodo.slice(0, 7))?.fecha_reunion ?? periodo;
  const lCuotas = cuotas.data ?? [];
  const total = (c: { ahorro: number | string; cadena: number | string; juegos: number | string }) =>
    Number(c.ahorro) + Number(c.cadena) + Number(c.juegos);
  const pagadas = lCuotas.filter((c) => c.estado === "pagada");
  const ahorroCuotas = pagadas.reduce((s, c) => s + Number(c.ahorro), 0);
  const aporteInicial = Number((aportes.data ?? []).find((a) => a.tipo === "inicial")?.monto ?? 0);
  const miTurno = lTurnos.find((t) => t.asociado_id === objetivo);

  const r = await nuevoReporte("Estado de cuenta", `${perfil.data.nombre}${perfil.data.ciudad ? ` · ${perfil.data.ciudad}` : ""} · generado el ${fechaCorta(hoy)}`);

  r.seccion("Resumen");
  r.linea("Ahorro acumulado (cuotas pagadas + aporte inicial)", pesos(ahorroCuotas + aporteInicial));
  r.linea("Cuotas pagadas", `${pagadas.length} de ${lCuotas.length}`);
  r.linea("Multas pendientes", pesos((multas.data ?? []).reduce((s, m) => s + Number(m.monto), 0)));
  if (miTurno) r.linea("Turno de cadena", `#${miTurno.turno} · ${fechaCorta(miTurno.fecha_reunion)}`);
  (aportes.data ?? []).forEach((a) =>
    r.linea(`Aporte ${a.tipo === "inicial" ? "inicial" : "tecnologico"} (${fechaCorta(a.fecha_pago)})`, pesos(Number(a.monto))),
  );

  if (prestamo.data) {
    const { data: movs } = await supabase.from("movimientos_prestamo").select("tipo, monto, fecha").eq("prestamo_id", prestamo.data.id).order("fecha");
    const p = Object.fromEntries((params.data ?? []).map((x) => [x.clave, Number(x.valor)]));
    const c = cuentasPrestamo(prestamo.data.desembolsado_en, movs ?? [], lTurnos.map((t) => t.fecha_reunion), hoy, {
      interes: p.interes_prestamo_pct ?? 4,
      mora: p.interes_mora_pct ?? 4,
    });
    r.seccion("Prestamo vigente");
    r.linea("Capital inicial", pesos(c.capitalInicial));
    r.linea("Saldo de capital", pesos(c.saldoCapital));
    r.linea("Interes mensual fijo", pesos(c.interesMensual));
    r.linea("Interes pendiente", pesos(c.interesPendiente));
    r.linea("Mora estimada", pesos(c.moraPendiente));
    const nombres: Record<string, string> = { desembolso: "Desembolso", interes: "Interes", abono_capital: "Abono a capital", interes_mora: "Mora" };
    if ((movs ?? []).length > 0) {
      r.tabla(["Fecha", "Movimiento", "Monto"], (movs ?? []).map((m) => [fechaCorta(m.fecha), nombres[m.tipo] ?? m.tipo, pesos(Number(m.monto))]), [110, 250, 135], [false, false, true]);
    }
  }

  r.seccion("Cuotas mes a mes");
  r.tabla(
    ["Mes", "Reunion", "Ahorro", "Cadena", "Juegos", "Total", "Estado"],
    lCuotas.map((c) => {
      const f = fechaDe(c.periodo);
      const estado = c.estado === "pagada" ? "Pagada" : f < hoy ? "En mora" : "Pendiente";
      return [mesLargo(c.periodo), fechaCorta(f), pesos(Number(c.ahorro)), pesos(Number(c.cadena)), pesos(Number(c.juegos)), pesos(total(c)), estado];
    }),
    [85, 80, 65, 65, 55, 70, 75],
    [false, false, true, true, true, true, false],
  );
  r.nota("Valores informativos del registro de la app; el fondo no mueve dinero a traves de ella.");

  const nombreArchivo = `estado-de-cuenta-${perfil.data.nombre.normalize("NFD").replace(/[^\w]+/g, "-").toLowerCase()}.pdf`;
  return respuestaPdf(await r.guardar(), nombreArchivo);
}
