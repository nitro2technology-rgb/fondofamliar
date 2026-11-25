import "server-only";
import type { crearClienteServidor } from "@/lib/supabase/server";
import { fechaCorta, pesos } from "@/lib/format";

export type ComprobantePrestamo = {
  id: string;
  prestamoId: string;
  detalle: string;
  total: string;
  fecha: string;
  estado: "pendiente" | "aprobado" | "rechazado";
  nota: string | null;
  url: string | null;
};

// Comprobantes de pago enviados para los préstamos indicados, del más reciente al más antiguo (RLS: admin o dueño).
export async function comprobantesDePrestamos(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  ids: string[],
): Promise<ComprobantePrestamo[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("pagos_prestamo")
    .select("id, prestamo_id, monto_interes, monto_4x1000, monto_mora, monto_capital, estado, nota, creado_en, ruta_archivo")
    .in("prestamo_id", ids)
    .order("creado_en", { ascending: false });
  const lista = data ?? [];
  const { data: firmadas } = lista.length
    ? await supabase.storage.from("comprobantes-pago").createSignedUrls(lista.map((x) => x.ruta_archivo), 3600)
    : { data: [] };

  return lista.map((x) => {
    const partes = [
      ["interés", Number(x.monto_interes)],
      ["4x1000", Number(x.monto_4x1000)],
      ["mora", Number(x.monto_mora)],
      ["capital", Number(x.monto_capital)],
    ] as const;
    return {
      id: x.id,
      prestamoId: x.prestamo_id,
      detalle: partes.filter(([, v]) => v > 0).map(([t, v]) => `${t} ${pesos(v)}`).join(" · "),
      total: pesos(partes.reduce((s, [, v]) => s + v, 0)),
      // La fecha de envío se muestra en hora de Colombia.
      fecha: fechaCorta(new Date(x.creado_en).toLocaleDateString("en-CA", { timeZone: "America/Bogota" })),
      estado: x.estado as ComprobantePrestamo["estado"],
      nota: x.nota,
      url: firmadas?.find((f) => f.path === x.ruta_archivo)?.signedUrl ?? null,
    };
  });
}
