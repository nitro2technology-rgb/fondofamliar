import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { desembolsarPrestamo, registrarMovimientoPrestamo, votarPrestamo } from "@/lib/acciones";
import { cuentasPrestamo } from "@/lib/prestamos";
import { fechaCorta, hoyColombia, pesos } from "@/lib/format";

export default function PrestamosAdmin() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Contenido />
    </Suspense>
  );
}

const campo =
  "w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

async function Contenido() {
  const yo = await requerirAdmin();
  const supabase = await crearClienteServidor();

  const [{ data: prestamos }, { data: votos }, { data: movs }, { data: turnos }, { data: params }, { data: caja }] =
    await Promise.all([
      supabase
        .from("prestamos")
        .select("id, monto, estado, radicado_en, desembolsado_en, perfiles!prestamos_asociado_id_fkey(nombre), externos(nombre)")
        .in("estado", ["radicado", "aprobado", "vigente"])
        .order("radicado_en"),
      supabase.from("votos_prestamo").select("prestamo_id, admin_id, voto"),
      supabase.from("movimientos_prestamo").select("prestamo_id, tipo, monto, fecha"),
      supabase.from("cadena_turnos").select("fecha_reunion"),
      supabase.from("parametros").select("clave, valor").in("clave", ["interes_prestamo_pct", "interes_mora_pct"]),
      supabase.rpc("caja_disponible"),
    ]);

  const p = Object.fromEntries((params ?? []).map((x) => [x.clave, Number(x.valor)]));
  const reuniones = (turnos ?? []).map((t) => t.fecha_reunion);
  const hoy = hoyColombia();
  const lista = (prestamos ?? []).map((x) => ({
    ...x,
    nombre: (x.perfiles as unknown as { nombre: string } | null)?.nombre ?? "",
    externo: (x.externos as unknown as { nombre: string } | null)?.nombre ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-8">
      <Link href="/admin" className="text-sm text-accent underline">
        ← Administración
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Préstamos</h1>
      <p className="text-sm text-muted">Caja disponible para prestar: {pesos(Number(caja ?? 0))}</p>

      {lista.length === 0 && <p className="text-muted">No hay solicitudes ni préstamos en curso.</p>}

      {lista.map((x, i) => {
        const v = (votos ?? []).filter((o) => o.prestamo_id === x.id);
        const miVoto = v.find((o) => o.admin_id === yo.id);
        const aFavor = v.filter((o) => o.voto === "aprobar").length;
        const enContra = v.filter((o) => o.voto === "rechazar").length;
        const m = (movs ?? []).filter((o) => o.prestamo_id === x.id);
        const c = cuentasPrestamo(x.desembolsado_en, m, reuniones, hoy, {
          interes: p.interes_prestamo_pct ?? 4,
          mora: p.interes_mora_pct ?? 4,
        });

        return (
          <div key={x.id} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{x.nombre}</p>
                <p className="text-xs text-muted">
                  {x.estado === "vigente" ? "Vigente" : `#${i + 1} en cola`} · radicado {fechaCorta(x.radicado_en.slice(0, 10))}
                  {x.externo && ` · externo: ${x.externo}`}
                </p>
              </div>
              <p className="font-semibold">{pesos(Number(x.monto))}</p>
            </div>

            {x.estado === "radicado" && (
              <>
                <p className="text-xs text-muted">
                  Votos: {aFavor} a favor · {enContra} en contra (se decide con 2)
                </p>
                {miVoto ? (
                  <p className="text-sm text-muted">Tu voto: {miVoto.voto === "aprobar" ? "aprobar" : "rechazar"}</p>
                ) : (
                  <form action={votarPrestamo} className="flex gap-2">
                    <input type="hidden" name="id" value={x.id} />
                    <button name="voto" value="aprobar" className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-fg">
                      Aprobar
                    </button>
                    <button name="voto" value="rechazar" className="flex-1 rounded-xl border border-card-border px-3 py-2 text-sm">
                      Rechazar
                    </button>
                  </form>
                )}
              </>
            )}

            {x.estado === "aprobado" && (
              <form action={desembolsarPrestamo}>
                <input type="hidden" name="id" value={x.id} />
                <button className="w-full rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-fg">
                  Registrar desembolso
                </button>
              </form>
            )}

            {x.estado === "vigente" && (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted">
                  <p>Saldo capital: {pesos(c.saldoCapital)}</p>
                  <p>Interés mensual: {pesos(c.interesMensual)}</p>
                  <p>Interés pendiente: {pesos(c.interesPendiente)}</p>
                  <p>Mora estimada: {pesos(c.moraPendiente)}</p>
                </div>
                <form action={registrarMovimientoPrestamo} className="space-y-2">
                  <input type="hidden" name="id" value={x.id} />
                  <input name="monto" inputMode="numeric" placeholder="Monto recibido" className={campo} />
                  <div className="grid grid-cols-3 gap-2">
                    <button name="tipo" value="interes" className="rounded-xl bg-accent px-2 py-2 text-xs font-medium text-accent-fg">
                      Interés
                    </button>
                    <button name="tipo" value="interes_mora" className="rounded-xl border border-card-border px-2 py-2 text-xs">
                      Mora
                    </button>
                    <button name="tipo" value="abono_capital" className="rounded-xl border border-card-border px-2 py-2 text-xs">
                      Capital
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        );
      })}
    </main>
  );
}
