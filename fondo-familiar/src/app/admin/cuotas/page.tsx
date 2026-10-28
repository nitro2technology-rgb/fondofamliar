import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { deshacerPagoCuota, registrarPagoCuota } from "@/lib/acciones";
import { fechaCorta, hoyColombia, mesLargo, pesos } from "@/lib/format";

export default function Cuotas({ searchParams }: PageProps<"/admin/cuotas">) {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/cuotas">["searchParams"] }) {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();

  const { data: turnos } = await supabase.from("cadena_turnos").select("turno, fecha_reunion").order("turno");
  const reuniones = turnos ?? [];
  const pedido = String((await searchParams).periodo ?? "");
  const elegido =
    reuniones.find((t) => t.fecha_reunion.slice(0, 7) === pedido.slice(0, 7)) ??
    reuniones.find((t) => t.fecha_reunion >= hoy) ??
    reuniones[0];

  const periodo = elegido ? `${elegido.fecha_reunion.slice(0, 7)}-01` : null;
  const { data: cuotas } = periodo
    ? await supabase
        .from("cuotas")
        .select("id, ahorro, cadena, juegos, estado, fecha_pago, perfiles!cuotas_asociado_id_fkey(nombre)")
        .eq("periodo", periodo)
    : { data: [] };

  const filas = (cuotas ?? [])
    .map((c) => ({ ...c, nombre: (c.perfiles as unknown as { nombre: string } | null)?.nombre ?? "" }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const pagadas = filas.filter((c) => c.estado === "pagada");
  const recaudado = pagadas.reduce((s, c) => s + Number(c.ahorro) + Number(c.cadena) + Number(c.juegos), 0);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-8">
      <Link href="/admin" className="text-sm text-accent underline">
        ← Administración
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Cuotas mensuales</h1>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {reuniones.map((t) => {
          const activo = t.fecha_reunion === elegido?.fecha_reunion;
          return (
            <Link
              key={t.turno}
              href={`/admin/cuotas?periodo=${t.fecha_reunion.slice(0, 7)}`}
              className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                activo ? "bg-accent text-accent-fg" : "border border-card-border text-muted"
              }`}
            >
              {mesLargo(t.fecha_reunion).slice(0, 3)} {t.fecha_reunion.slice(2, 4)}
            </Link>
          );
        })}
      </div>

      {elegido && (
        <p className="text-sm text-muted">
          {mesLargo(elegido.fecha_reunion)} · reunión {fechaCorta(elegido.fecha_reunion)} · {pagadas.length} de{" "}
          {filas.length} pagadas · {pesos(recaudado)}
        </p>
      )}

      <div className="space-y-2">
        {filas.map((c) => {
          const total = Number(c.ahorro) + Number(c.cadena) + Number(c.juegos);
          const pagada = c.estado === "pagada";
          const mora = !pagada && elegido && elegido.fecha_reunion < hoy;
          return (
            <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-card-border bg-card p-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{c.nombre}</p>
                <p className="text-xs text-muted">
                  {pesos(total)}
                  {Number(c.cadena) === 0 && " · recibe cadena"}
                  {pagada && c.fecha_pago && ` · pagó ${fechaCorta(c.fecha_pago)}`}
                  {mora && " · en mora"}
                </p>
              </div>
              <form action={pagada ? deshacerPagoCuota : registrarPagoCuota}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  className={`rounded-xl px-3 py-2 text-xs font-medium ${
                    pagada ? "border border-card-border text-muted" : "bg-accent text-accent-fg"
                  }`}
                >
                  {pagada ? "Deshacer" : "Registrar pago"}
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </main>
  );
}
