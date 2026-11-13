import "server-only";
import { crearClienteServidor } from "@/lib/supabase/server";
import { carteraVigente } from "@/lib/cartera";
import { hoyColombia } from "@/lib/format";

// Hora de Colombia (UTC-5, sin horario de verano) de la reunión de liquidación.
// Los pagos de préstamos se aceptan hasta un minuto antes (reunión 7:00 p. m. -> hasta 6:59 p. m.).
export function plazoDevolucion(fecha: string, hora: string) {
  const [h, m] = hora.split(":").map(Number);
  const reunion = new Date(`${fecha}T00:00:00-05:00`);
  reunion.setUTCHours(reunion.getUTCHours() + h, reunion.getUTCMinutes() + m);
  const limite = new Date(reunion.getTime() - 60_000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" });
  return { reunion, limite, horaReunion: fmt(reunion), horaLimite: fmt(limite) };
}

// ¿Está cerrado el ciclo? (interruptor en parámetros; si no existe, se considera abierto)
export async function cicloCerrado() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("parametros").select("valor").eq("clave", "ciclo_cerrado").maybeSingle();
  return Number(data?.valor ?? 0) === 1;
}

// ¿Ya venció el plazo para devolver los préstamos (un minuto antes de la última reunión)?
export async function plazoVencido() {
  const supabase = await crearClienteServidor();
  const { data } = await supabase.from("cadena_turnos").select("fecha_reunion").order("turno", { ascending: false }).limit(1);
  const ultima = data?.[0]?.fecha_reunion;
  if (!ultima) return null;
  const { data: r } = await supabase.from("reuniones").select("hora").eq("fecha", ultima).maybeSingle();
  const plazo = plazoDevolucion(ultima, r?.hora?.slice(0, 5) ?? "19:30");
  return Date.now() > plazo.limite.getTime() ? plazo : null;
}

// Liquidación del ciclo: ahorro de cada asociado + partes iguales de las utilidades.
// Utilidades = intereses + mora cobrados + multas pagadas + utilidad de los juegos.
export async function datosCierre() {
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();

  const [cartera, turnos, perfiles, cuotas, aportes, movs, multas, juegos, reuniones] = await Promise.all([
    carteraVigente(hoy),
    supabase.from("cadena_turnos").select("turno, fecha_reunion").order("turno"),
    supabase.from("perfiles").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("cuotas").select("asociado_id, ahorro").eq("estado", "pagada"),
    supabase.from("aportes_unicos").select("asociado_id, monto").eq("tipo", "inicial"),
    supabase.from("movimientos_prestamo").select("tipo, monto").in("tipo", ["interes", "interes_mora"]),
    supabase.from("multas").select("monto").eq("pagada", true),
    supabase.from("juegos").select("utilidad"),
    supabase.from("reuniones").select("fecha, hora"),
  ]);

  const suma = (xs: { [k: string]: unknown }[] | null, campo: string) =>
    (xs ?? []).reduce((s, x) => s + Number(x[campo] ?? 0), 0);

  const asociados = perfiles.data ?? [];
  const utilidades = {
    intereses: suma((movs.data ?? []).filter((m) => m.tipo === "interes"), "monto"),
    mora: suma((movs.data ?? []).filter((m) => m.tipo === "interes_mora"), "monto"),
    multas: suma(multas.data, "monto"),
    juegos: suma(juegos.data, "utilidad"),
  };
  const totalUtilidades = utilidades.intereses + utilidades.mora + utilidades.multas + utilidades.juegos;
  const parte = asociados.length ? Math.floor(totalUtilidades / asociados.length) : 0;

  const filas = asociados.map((a) => {
    const ahorro =
      suma((cuotas.data ?? []).filter((c) => c.asociado_id === a.id), "ahorro") +
      suma((aportes.data ?? []).filter((x) => x.asociado_id === a.id), "monto");
    return { id: a.id, nombre: a.nombre, ahorro, utilidad: parte, total: ahorro + parte };
  });

  const ultima = (turnos.data ?? []).at(-1)?.fecha_reunion ?? null;
  const hora = (reuniones.data ?? []).find((r) => r.fecha === ultima)?.hora?.slice(0, 5) ?? "19:30";
  const pendientes = cartera.filter((c) => c.cuentas.saldoCapital > 0 || c.cuentas.interesPendiente > 0 || c.cuentas.moraPendiente > 0);

  return {
    hoy,
    ultima,
    plazo: ultima ? plazoDevolucion(ultima, hora) : null,
    vencido: ultima ? Date.now() > plazoDevolucion(ultima, hora).limite.getTime() : false,
    pendientes,
    deudaTotal: pendientes.reduce((s, c) => s + c.cuentas.saldoCapital + c.cuentas.interesPendiente + c.cuentas.moraPendiente, 0),
    utilidades,
    totalUtilidades,
    parte,
    filas,
    totalAhorro: filas.reduce((s, f) => s + f.ahorro, 0),
    totalLiquidar: filas.reduce((s, f) => s + f.total, 0),
  };
}
