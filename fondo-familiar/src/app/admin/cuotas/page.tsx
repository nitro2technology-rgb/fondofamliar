import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock, TriangleAlert } from "lucide-react";
import Avatar from "@/components/Avatar";
import SelectorMes from "@/components/SelectorMes";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fechaCorta, hoyColombia, mesLargo, pesos } from "@/lib/format";

export default function Cuotas({ searchParams }: PageProps<"/admin/cuotas">) {
  return (
    <Suspense fallback={<main className="flex-1 px-4 pt-6 text-muted">Cargando…</main>}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/cuotas">["searchParams"] }) {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();

  const { data: turnos } = await supabase.from("cadena_turnos").select("turno, fecha_reunion, nombre_listado").order("turno");
  const reuniones = turnos ?? [];
  const pedido = String((await searchParams).periodo ?? "");
  const elegido =
    reuniones.find((t) => t.fecha_reunion.slice(0, 7) === pedido.slice(0, 7)) ??
    reuniones.find((t) => t.fecha_reunion >= hoy) ??
    reuniones[0];
  if (!elegido) return <main className="px-4 py-8 text-muted">No hay meses configurados.</main>;

  const mes = elegido.fecha_reunion.slice(0, 7);
  const { data: cuotas } = await supabase
    .from("cuotas")
    .select("id, asociado_id, ahorro, cadena, juegos, estado, fecha_pago, perfiles!cuotas_asociado_id_fkey(nombre)")
    .eq("periodo", `${mes}-01`);

  const filas = (cuotas ?? [])
    .map((c) => ({
      ...c,
      nombre: (c.perfiles as unknown as { nombre: string } | null)?.nombre ?? "",
      total: Number(c.ahorro) + Number(c.cadena) + Number(c.juegos),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  const pagaron = filas.filter((c) => c.estado === "pagada");
  const deben = filas.filter((c) => c.estado !== "pagada");
  const recaudado = pagaron.reduce((s, c) => s + c.total, 0);
  const esperado = filas.reduce((s, c) => s + c.total, 0);
  const vencida = elegido.fecha_reunion < hoy;
  const pct = filas.length ? Math.round((pagaron.length / filas.length) * 100) : 0;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6">
      <Link href="/admin/mas" className="text-sm text-accent">
        ← Más
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Cuotas mensuales</h1>

      <SelectorMes
        base="/admin/cuotas?periodo="
        actual={mes}
        opciones={reuniones.map((t) => ({ valor: t.fecha_reunion.slice(0, 7), texto: `${mesLargo(t.fecha_reunion)} · reunión ${fechaCorta(t.fecha_reunion)}` }))}
      />

      <section className="rounded-[28px] bg-card p-5">
        <p className="text-sm text-muted">
          {mesLargo(elegido.fecha_reunion)} · cadena de {elegido.nombre_listado}
        </p>
        <p className="mt-1 text-4xl font-extrabold tracking-tight">
          {pagaron.length}/{filas.length} <span className="text-base font-medium text-muted">han pagado</span>
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-card-border">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-2xl bg-background px-2 py-3">
            <p className="font-bold">{pesos(recaudado)}</p>
            <p className="text-[11px] text-muted">Recaudado</p>
          </div>
          <div className="rounded-2xl bg-background px-2 py-3">
            <p className="font-bold">{pesos(esperado - recaudado)}</p>
            <p className="text-[11px] text-muted">Por recaudar</p>
          </div>
        </div>
      </section>

      {deben.length > 0 && (
        <Link
          href={`/admin/pagos?tipo=cuota&periodo=${mes}&filtro=deben`}
          className="flex items-center justify-center gap-2 rounded-full bg-accent py-4 font-semibold text-accent-fg"
        >
          Cobrar a {deben.length} que deben
          <ArrowRight size={20} />
        </Link>
      )}

      <Lista titulo={`Faltan por pagar (${deben.length})`} vacio="¡Todos pagaron este mes!">
        {deben.map((c) => (
          <Fila key={c.id} c={c} estado={vencida ? "mora" : "pendiente"} />
        ))}
      </Lista>

      <Lista titulo={`Ya pagaron (${pagaron.length})`} vacio="Nadie ha pagado todavía.">
        {pagaron.map((c) => (
          <Fila key={c.id} c={c} estado="pagada" />
        ))}
      </Lista>
    </main>
  );
}

function Lista({ titulo, vacio, children }: { titulo: string; vacio: string; children: React.ReactNode[] }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-lg font-semibold">{titulo}</h2>
      {children.length === 0 ? (
        <p className="rounded-[28px] bg-card p-5 text-sm text-muted">{vacio}</p>
      ) : (
        <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-2">{children}</div>
      )}
    </section>
  );
}

function Fila({
  c,
  estado,
}: {
  c: { asociado_id: string; nombre: string; total: number; cadena: number | string; fecha_pago: string | null };
  estado: "pagada" | "pendiente" | "mora";
}) {
  const Icono = estado === "pagada" ? Check : estado === "mora" ? TriangleAlert : Clock;
  return (
    <Link href={`/admin/socio/${c.asociado_id}`} className="flex items-center gap-3 px-2 py-3">
      <Avatar nombre={c.nombre} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{c.nombre}</p>
        <p className="text-xs text-muted">
          {pesos(c.total)}
          {Number(c.cadena) === 0 && " · recibe cadena"}
          {estado === "pagada" && c.fecha_pago && ` · pagó ${fechaCorta(c.fecha_pago)}`}
        </p>
      </div>
      <span
        className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
          estado === "pagada" ? "bg-accent-soft text-accent" : estado === "mora" ? "bg-danger/15 text-danger" : "bg-amber/15 text-amber"
        }`}
      >
        <Icono size={12} />
        {estado === "pagada" ? "Pagada" : estado === "mora" ? "En mora" : "Pendiente"}
      </span>
    </Link>
  );
}
