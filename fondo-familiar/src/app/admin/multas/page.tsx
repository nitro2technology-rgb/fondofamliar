import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { marcarMultaPagada } from "@/lib/acciones";
import { pesos } from "@/lib/format";

export default function Multas() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("multas")
    .select("id, motivo, monto, pagada, perfiles!multas_asociado_id_fkey(nombre), reuniones(fecha)")
    .order("pagada")
    .order("id");

  const filas = (data ?? []).map((m) => ({
    ...m,
    nombre: (m.perfiles as unknown as { nombre: string } | null)?.nombre ?? "",
    fecha: (m.reuniones as unknown as { fecha: string } | null)?.fecha ?? "",
  }));
  const pendiente = filas.filter((m) => !m.pagada).reduce((s, m) => s + Number(m.monto), 0);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-8">
      <Link href="/admin" className="text-sm text-accent underline">
        ← Administración
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Multas</h1>
      <p className="text-sm text-muted">Pendiente por cobrar: {pesos(pendiente)}</p>
      {filas.length === 0 && <p className="text-muted">No hay multas registradas.</p>}
      <div className="space-y-2">
        {filas.map((m) => (
          <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-card-border bg-card p-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{m.nombre}</p>
              <p className="text-xs text-muted">
                {m.motivo} · {m.fecha.slice(0, 10)} · {pesos(Number(m.monto))}
              </p>
            </div>
            <form action={marcarMultaPagada}>
              <input type="hidden" name="id" value={m.id} />
              <input type="hidden" name="pagada" value={m.pagada ? "no" : "si"} />
              <button
                className={`rounded-xl px-3 py-2 text-xs font-medium ${
                  m.pagada ? "border border-card-border text-muted" : "bg-accent text-accent-fg"
                }`}
              >
                {m.pagada ? "Deshacer" : "Marcar pagada"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </main>
  );
}
