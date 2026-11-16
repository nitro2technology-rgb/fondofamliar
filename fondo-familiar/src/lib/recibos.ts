import "server-only";
import { clienteAdmin } from "@/lib/supabase/admin";
import { hoyColombia } from "@/lib/format";

export type EstadoRecibo = "confirmado" | "por_confirmar" | "rechazado" | "sin_subir";

export type FilaRecibo = {
  cuotaId: string;
  nombre: string;
  monto: number;
  estado: EstadoRecibo;
  reporteId: string | null;
  nota: string | null;
  url: string | null;
  confirmadoPorMi: boolean;
};

// Pagos de cadena de un mes, tal como los ve quien tiene el turno (lectura con service role:
// quien recibe no puede leer cuotas ni comprobantes ajenos por RLS, así que el acceso se valida en el servidor).
export async function detalleCadena(periodo: string, receptorId: string) {
  const db = clienteAdmin();
  const { data: cuotas } = await db
    .from("cuotas")
    .select("id, cadena, estado, perfiles!cuotas_asociado_id_fkey(nombre)")
    .eq("periodo", periodo)
    .gt("cadena", 0);
  const lista = cuotas ?? [];
  const { data: reportes } = lista.length
    ? await db
        .from("pagos_reportados")
        .select("id, cuota_id, estado, nota, ruta_archivo, revisado_por")
        .eq("tipo", "cadena")
        .in("cuota_id", lista.map((c) => c.id))
    : { data: [] };

  const rutas = (reportes ?? []).map((r) => r.ruta_archivo);
  const { data: firmadas } = rutas.length
    ? await db.storage.from("comprobantes-pago").createSignedUrls(rutas, 3600)
    : { data: [] };

  const filas: FilaRecibo[] = lista
    .map((c) => {
      const r = (reportes ?? []).find((x) => x.cuota_id === c.id);
      // Sin comprobante aprobado no hay confirmación, aunque la cuota figure como pagada.
      const confirmado = r?.estado === "aprobado";
      const estado: EstadoRecibo = confirmado
        ? "confirmado"
        : r?.estado === "pendiente"
          ? "por_confirmar"
          : r?.estado === "rechazado"
            ? "rechazado"
            : "sin_subir";
      return {
        cuotaId: c.id,
        nombre: (c.perfiles as unknown as { nombre: string } | null)?.nombre ?? "",
        monto: Number(c.cadena),
        estado,
        reporteId: r?.id ?? null,
        nota: r?.nota ?? null,
        url: r ? (firmadas?.find((f) => f.path === r.ruta_archivo)?.signedUrl ?? null) : null,
        confirmadoPorMi: r?.estado === "aprobado" && r.revisado_por === receptorId,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  return {
    filas,
    total: filas.length,
    confirmados: filas.filter((f) => f.estado === "confirmado").length,
    porConfirmar: filas.filter((f) => f.estado === "por_confirmar").length,
    sinSubir: filas.filter((f) => f.estado === "sin_subir").length,
  };
}

// Turno de cadena del asociado para llevar el control de los pagos que recibe.
// Durante todo su mes se ve siempre (aunque ya estén todos confirmados) y solo con los comprobantes de ese mes.
// Si termina el mes con pagos sin confirmar, sigue apareciendo hasta confirmarlos.
export async function turnoPorConfirmar(asociadoId: string) {
  const { data: turnos } = await clienteAdmin()
    .from("cadena_turnos")
    .select("turno, fecha_reunion")
    .eq("asociado_id", asociadoId)
    .order("turno");
  const hoy = hoyColombia();
  const mesActual = hoy.slice(0, 7);

  for (const t of turnos ?? []) {
    const periodo = `${t.fecha_reunion.slice(0, 7)}-01`;
    if (periodo > hoy) continue;
    if (periodo.slice(0, 7) === mesActual) {
      const detalle = await detalleCadena(periodo, asociadoId);
      if (detalle.total > 0) return { turno: t, periodo, ...detalle };
      continue;
    }
    const detalle = await detalleCadena(periodo, asociadoId);
    if (detalle.total > 0 && detalle.confirmados < detalle.total) return { turno: t, periodo, ...detalle };
  }
  return null;
}
