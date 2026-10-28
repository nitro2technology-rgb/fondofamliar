import "server-only";
import { crearClienteServidor } from "@/lib/supabase/server";
import { hoyColombia } from "@/lib/format";

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
