import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { deshacerEntregaCadena, registrarEntregaCadena } from "@/lib/acciones";
import { fechaCorta, pesos } from "@/lib/format";

export default function Cadena() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const [{ data: turnos }, { data: cuotas }, { data: entregas }] = await Promise.all([
    supabase
      .from("cadena_turnos")
      .select("turno, nombre_listado, fecha_reunion")
      .order("turno"),
    supabase.from("cuotas").select("periodo, cadena").eq("estado", "pagada"),
    supabase.from("entregas_cadena").select("turno, monto, fecha_entrega"),
  ]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-8">
      <Link href="/admin" className="text-sm text-accent underline">
        ← Administración
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Cadena</h1>
      <p className="text-sm text-muted">Recaudo del mes que se entrega a quien tiene el turno (máximo 18 × $40.000).</p>
      <div className="space-y-2">
        {(turnos ?? []).map((t) => {
          const recaudado = (cuotas ?? [])
            .filter((c) => c.periodo.slice(0, 7) === t.fecha_reunion.slice(0, 7))
            .reduce((s, c) => s + Number(c.cadena), 0);
          const entrega = (entregas ?? []).find((e) => e.turno === t.turno);
          return (
            <div key={t.turno} className="flex items-center gap-3 rounded-2xl border border-card-border bg-card p-3">
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {t.turno}. {t.nombre_listado}
                </p>
                <p className="text-xs text-muted">
                  {fechaCorta(t.fecha_reunion)} · recaudado {pesos(recaudado)}
                  {entrega && ` · entregado ${pesos(Number(entrega.monto))} el ${fechaCorta(entrega.fecha_entrega)}`}
                </p>
              </div>
              <form action={entrega ? deshacerEntregaCadena : registrarEntregaCadena}>
                <input type="hidden" name="turno" value={t.turno} />
                <input type="hidden" name="monto" value={recaudado} />
                <button
                  className={`rounded-xl px-3 py-2 text-xs font-medium ${
                    entrega ? "border border-card-border text-muted" : "bg-accent text-accent-fg"
                  }`}
                >
                  {entrega ? "Deshacer" : "Registrar entrega"}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </main>
  );
}
