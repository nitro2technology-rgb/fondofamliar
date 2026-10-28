import "server-only";
import { crearClienteServidor } from "@/lib/supabase/server";
import { hoyColombia } from "@/lib/format";
import { cuentasPrestamo } from "@/lib/prestamos";

// Estado de cuenta del asociado con sesión (RLS solo le devuelve lo suyo).
export async function estadoDeCuenta(asociadoId: string) {
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();

  const [cuotas, turnos, aportes, multas] = await Promise.all([
    supabase.from("cuotas").select("periodo, ahorro, cadena, juegos, estado").eq("asociado_id", asociadoId).order("periodo"),
    supabase.from("cadena_turnos").select("asociado_id, turno, fecha_reunion").order("turno"),
    supabase.from("aportes_unicos").select("tipo, monto").eq("asociado_id", asociadoId),
    supabase.from("multas").select("monto").eq("asociado_id", asociadoId).eq("pagada", false),
  ]);

  const listaCuotas = cuotas.data ?? [];
  const listaTurnos = turnos.data ?? [];
  const fechaDelPeriodo = (periodo: string) =>
    listaTurnos.find((t) => t.fecha_reunion.slice(0, 7) === periodo.slice(0, 7))?.fecha_reunion ?? periodo;

  const proxima = listaCuotas.find((c) => c.estado !== "pagada");
  const vence = proxima ? fechaDelPeriodo(proxima.periodo) : null;

  const ahorroCuotas = listaCuotas.filter((c) => c.estado === "pagada").reduce((s, c) => s + Number(c.ahorro), 0);
  const aporteInicial = (aportes.data ?? []).find((a) => a.tipo === "inicial");

  return {
    historial: listaCuotas.map((c) => ({
      periodo: c.periodo,
      total: Number(c.ahorro) + Number(c.cadena) + Number(c.juegos),
      pagada: c.estado === "pagada",
      vencida: fechaDelPeriodo(c.periodo) < hoy,
    })),
    cuota: proxima && vence
      ? {
          total: Number(proxima.ahorro) + Number(proxima.cadena) + Number(proxima.juegos),
          vence,
          estado: vence < hoy ? "En mora" : "Pendiente",
        }
      : null,
    ahorro: ahorroCuotas + Number(aporteInicial?.monto ?? 0),
    miTurno: listaTurnos.find((t) => t.asociado_id === asociadoId) ?? null,
    proximaReunion: listaTurnos.map((t) => t.fecha_reunion).find((f) => f >= hoy) ?? null,
    multasPendientes: (multas.data ?? []).reduce((s, m) => s + Number(m.monto), 0),
  };
}

// Préstamo en curso del asociado (si lo hay) y lo que puede pedir.
export async function resumenPrestamo(asociadoId: string) {
  const supabase = await crearClienteServidor();
  const [{ data: prestamo }, { data: params }, { data: turnos }, { data: caja }] = await Promise.all([
    supabase
      .from("prestamos")
      .select("id, estado, monto, desembolsado_en")
      .eq("asociado_id", asociadoId)
      .in("estado", ["radicado", "aprobado", "vigente"])
      .maybeSingle(),
    supabase.from("parametros").select("clave, valor").in("clave", ["interes_prestamo_pct", "interes_mora_pct", "tope_prestamo"]),
    supabase.from("cadena_turnos").select("fecha_reunion"),
    supabase.rpc("caja_disponible"),
  ]);
  const p = Object.fromEntries((params ?? []).map((x) => [x.clave, Number(x.valor)]));
  const tope = p.tope_prestamo ?? 1_000_000;
  const puedePedir = Math.min(tope, Math.max(0, Number(caja ?? 0)));
  if (!prestamo) return { prestamo: null, tope, puedePedir };

  const { data: movs } = await supabase
    .from("movimientos_prestamo")
    .select("tipo, monto, fecha")
    .eq("prestamo_id", prestamo.id);
  const cuentas = cuentasPrestamo(
    prestamo.desembolsado_en,
    movs ?? [],
    (turnos ?? []).map((t) => t.fecha_reunion),
    hoyColombia(),
    { interes: p.interes_prestamo_pct ?? 4, mora: p.interes_mora_pct ?? 4 },
  );
  return { prestamo: { ...prestamo, cuentas }, tope, puedePedir };
}
