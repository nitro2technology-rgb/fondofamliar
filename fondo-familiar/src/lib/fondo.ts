import "server-only";
import { crearClienteServidor } from "@/lib/supabase/server";
import { carteraVigente } from "@/lib/cartera";
import { hoyColombia } from "@/lib/format";
import { mesesDeCaptura } from "@/lib/capturas";

// Resumen del fondo para el panel de administración (llamar solo tras requerirAdmin).
export async function resumenFondo() {
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();

  const [cartera, { data: caja }, { data: turnos }, pagos, pagosPrestamo, { data: solicitudes }, { data: capturas }] = await Promise.all([
    carteraVigente(hoy),
    supabase.rpc("caja_disponible"),
    supabase.from("cadena_turnos").select("turno, nombre_listado, fecha_reunion").order("turno"),
    supabase.from("pagos_reportados").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    supabase.from("pagos_prestamo").select("id", { count: "exact", head: true }).eq("estado", "pendiente"),
    supabase.from("prestamos").select("id").eq("estado", "radicado"),
    supabase.from("capturas_cuenta").select("periodo"),
  ]);

  const lista = turnos ?? [];
  const siguiente = lista.find((t) => t.fecha_reunion >= hoy) ?? null;
  const despues = siguiente ? (lista.find((t) => t.turno === siguiente.turno + 1) ?? null) : null;

  const activos = cartera
    .filter((c) => c.cuentas.saldoCapital > 0)
    .sort((a, b) => b.cuentas.saldoCapital - a.cuentas.saldoCapital);

  // Primera captura NU que falta entre los meses cuya reunión ya llegó (la más antigua pendiente).
  const subidas = new Set((capturas ?? []).map((c) => c.periodo.slice(0, 7)));
  const capturaPendiente =
    mesesDeCaptura(lista, hoy)
      .map((m) => m.mes)
      .find((m) => !subidas.has(m)) ?? null;

  return {
    hoy,
    capturaPendiente,
    caja: Math.max(0, Number(caja ?? 0)),
    activos,
    enCartera: activos.reduce((s, c) => s + c.cuentas.saldoCapital, 0),
    porCobrar: activos.reduce((s, c) => s + c.cuentas.interesPendiente + c.cuentas.moraPendiente, 0),
    siguiente,
    despues,
    pagosPorRevisar: (pagos.count ?? 0) + (pagosPrestamo.count ?? 0),
    solicitudesEnVotacion: solicitudes?.length ?? 0,
    ultimaReunion: lista.length ? lista[lista.length - 1].fecha_reunion : null,
  };
}
