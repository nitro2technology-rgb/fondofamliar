import "server-only";
import { clienteAdmin } from "@/lib/supabase/admin";
import { cuentasPrestamo } from "@/lib/prestamos";

// Préstamos vigentes con lo que debe cada uno a la fecha `hoy` (solo servidor, salta RLS: para crons).
export async function carteraVigente(hoy: string) {
  const db = clienteAdmin();
  const [{ data: prestamos }, { data: movs }, { data: params }] = await Promise.all([
    db
      .from("prestamos")
      .select("id, asociado_id, desembolsado_en, cobrar_4x1000, perfiles!prestamos_asociado_id_fkey(nombre, correo, activo)")
      .eq("estado", "vigente"),
    db.from("movimientos_prestamo").select("prestamo_id, tipo, monto, fecha"),
    db.from("parametros").select("clave, valor").in("clave", ["interes_prestamo_pct", "interes_mora_pct"]),
  ]);
  const p = Object.fromEntries((params ?? []).map((x) => [x.clave, Number(x.valor)]));

  return (prestamos ?? []).map((x) => {
    const perfil = x.perfiles as unknown as { nombre: string; correo: string; activo: boolean } | null;
    const cuentas = cuentasPrestamo(
      x.desembolsado_en,
      (movs ?? []).filter((m) => m.prestamo_id === x.id),
      hoy,
      { interes: p.interes_prestamo_pct ?? 4, mora: p.interes_mora_pct ?? 4 },
      x.cobrar_4x1000,
    );
    return { id: x.id, asociadoId: x.asociado_id as string, nombre: perfil?.nombre ?? "", correo: perfil?.correo ?? null, activo: perfil?.activo ?? false, cuentas };
  });
}
