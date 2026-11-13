import { Suspense } from "react";
import Link from "next/link";
import Avatar from "@/components/Avatar";
import BotonEnvio from "@/components/BotonEnvio";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { marcarMultaPagada } from "@/lib/acciones";
import { fechaCorta, pesos } from "@/lib/format";

export default function Multas() {
  return (
    <Suspense fallback={<main className="flex-1 px-4 pt-6 text-muted">Cargando…</main>}>
      <Contenido />
    </Suspense>
  );
}

type Fila = {
  id: string;
  asociado_id: string;
  motivo: string;
  monto: number;
  pagada: boolean;
  nombre: string;
  fecha: string;
};

async function Contenido() {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("multas")
    .select("id, asociado_id, motivo, monto, pagada, perfiles!multas_asociado_id_fkey(nombre), reuniones(fecha)")
    .order("id");

  const filas: Fila[] = (data ?? []).map((m) => ({
    id: m.id,
    asociado_id: m.asociado_id,
    motivo: m.motivo,
    monto: Number(m.monto),
    pagada: m.pagada,
    nombre: (m.perfiles as unknown as { nombre: string } | null)?.nombre ?? "",
    fecha: (m.reuniones as unknown as { fecha: string } | null)?.fecha ?? "",
  }));
  const porCobrar = filas.filter((m) => !m.pagada);
  const cobradas = filas.filter((m) => m.pagada);
  const totalPendiente = porCobrar.reduce((s, m) => s + m.monto, 0);
  const totalCobrado = cobradas.reduce((s, m) => s + m.monto, 0);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6">
      <Link href="/admin/mas" className="text-sm text-accent">
        ← Más
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Multas</h1>

      <section className="rounded-[28px] bg-card p-5">
        <p className="text-sm text-muted">Pendiente por cobrar</p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">{pesos(totalPendiente)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-background px-2 py-3">
            <p className="font-bold">{porCobrar.length}</p>
            <p className="text-[11px] text-muted">Por cobrar</p>
          </div>
          <div className="rounded-2xl bg-background px-2 py-3">
            <p className="font-bold">{pesos(totalCobrado)}</p>
            <p className="text-[11px] text-muted">Ya cobrado</p>
          </div>
        </div>
      </section>

      <Lista titulo={`Por cobrar (${porCobrar.length})`} vacio="No hay multas pendientes." filas={porCobrar} />
      <Lista titulo={`Cobradas (${cobradas.length})`} vacio="Todavía no se ha cobrado ninguna." filas={cobradas} />
    </main>
  );
}

function Lista({ titulo, vacio, filas }: { titulo: string; vacio: string; filas: Fila[] }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-lg font-semibold">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="rounded-[28px] bg-card p-5 text-sm text-muted">{vacio}</p>
      ) : (
        <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-2">
          {filas.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-2 py-3">
              <Link href={`/admin/socio/${m.asociado_id}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar nombre={m.nombre} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.nombre}</p>
                  <p className="truncate text-xs text-muted">
                    {m.motivo}
                    {m.fecha && ` · ${fechaCorta(m.fecha)}`} · {pesos(m.monto)}
                  </p>
                </div>
              </Link>
              <form action={marcarMultaPagada}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="pagada" value={m.pagada ? "no" : "si"} />
                <BotonEnvio
                  className={`rounded-full px-4 py-2 text-xs font-semibold ${
                    m.pagada ? "bg-background text-muted" : "bg-accent text-accent-fg"
                  }`}
                >
                  {m.pagada ? "Deshacer" : "Cobrar"}
                </BotonEnvio>
              </form>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
