import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { hoyColombia, mesLargo, pesos } from "@/lib/format";
import RevisionPago from "./RevisionPago";

export default function PagosReportados({ searchParams }: PageProps<"/admin/pagos">) {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/pagos">["searchParams"] }) {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();

  const { data: turnos } = await supabase.from("cadena_turnos").select("turno, fecha_reunion, nombre_listado").order("turno");
  const meses = turnos ?? [];
  const pedido = String((await searchParams).periodo ?? "");
  const elegido =
    meses.find((t) => t.fecha_reunion.slice(0, 7) === pedido.slice(0, 7)) ??
    meses.find((t) => t.fecha_reunion >= hoy) ??
    meses[0];
  const periodo = elegido ? `${elegido.fecha_reunion.slice(0, 7)}-01` : null;

  const { data: cuotas } = periodo
    ? await supabase
        .from("cuotas")
        .select("id, ahorro, cadena, juegos, estado, perfiles!cuotas_asociado_id_fkey(nombre)")
        .eq("periodo", periodo)
    : { data: [] };
  const ids = (cuotas ?? []).map((c) => c.id);
  const { data: reportes } = ids.length
    ? await supabase.from("pagos_reportados").select("id, cuota_id, tipo, estado, nota, monto, ruta_archivo").in("cuota_id", ids)
    : { data: [] };

  const rutas = (reportes ?? []).map((r) => r.ruta_archivo);
  const { data: firmadas } = rutas.length
    ? await supabase.storage.from("comprobantes-pago").createSignedUrls(rutas, 3600)
    : { data: [] };
  const urlDe = (ruta: string) => firmadas?.find((f) => f.path === ruta)?.signedUrl ?? null;

  const filas = (cuotas ?? [])
    .map((c) => {
      const mios = (reportes ?? []).filter((r) => r.cuota_id === c.id);
      return {
        id: c.id,
        nombre: (c.perfiles as unknown as { nombre: string } | null)?.nombre ?? "",
        pagada: c.estado === "pagada",
        fondo: Number(c.ahorro) + Number(c.juegos),
        cadena: Number(c.cadena),
        repFondo: mios.find((r) => r.tipo === "fondo"),
        repCadena: mios.find((r) => r.tipo === "cadena"),
      };
    })
    .map((f) => ({
      ...f,
      porRevisar: [f.repFondo, f.repCadena].filter((r) => r?.estado === "pendiente").length,
    }))
    .sort((a, b) => b.porRevisar - a.porRevisar || a.nombre.localeCompare(b.nombre));

  const porRevisar = filas.reduce((s, f) => s + f.porRevisar, 0);
  const pagadas = filas.filter((f) => f.pagada).length;
  const sinEnviar = filas.filter((f) => !f.pagada && !f.repFondo && !f.repCadena).length;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-8">
      <Link href="/admin" className="text-sm text-accent underline">
        ← Administración
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Pagos reportados</h1>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {meses.map((t) => (
          <Link
            key={t.turno}
            href={`/admin/pagos?periodo=${t.fecha_reunion.slice(0, 7)}`}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              t.fecha_reunion === elegido?.fecha_reunion ? "bg-accent text-accent-fg" : "border border-card-border text-muted"
            }`}
          >
            {mesLargo(t.fecha_reunion).slice(0, 3)} {t.fecha_reunion.slice(2, 4)}
          </Link>
        ))}
      </div>

      {elegido && (
        <p className="text-sm text-muted">
          {mesLargo(elegido.fecha_reunion)} · turno de cadena: {elegido.nombre_listado}
          <br />
          {porRevisar} por revisar · {pagadas} de {filas.length} cuotas pagadas · {sinEnviar} sin enviar nada
        </p>
      )}

      <div className="space-y-2">
        {filas.map((f) => (
          <div key={f.id} className="space-y-2 rounded-2xl border border-card-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{f.nombre}</p>
              {f.pagada && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">Cuota pagada</span>}
            </div>
            {!f.repFondo && !f.repCadena && <p className="text-xs text-muted">No ha enviado comprobantes.</p>}
            {f.repFondo && (
              <RevisionPago
                key={`${f.repFondo.id}-${f.repFondo.estado}`}
                id={f.repFondo.id}
                titulo="Fondo"
                monto={pesos(Number(f.repFondo.monto))}
                estadoInicial={f.repFondo.estado}
                notaInicial={f.repFondo.nota}
                url={urlDe(f.repFondo.ruta_archivo)}
              />
            )}
            {f.repCadena && (
              <RevisionPago
                key={`${f.repCadena.id}-${f.repCadena.estado}`}
                id={f.repCadena.id}
                titulo="Cadena"
                monto={pesos(Number(f.repCadena.monto))}
                estadoInicial={f.repCadena.estado}
                notaInicial={f.repCadena.nota}
                url={urlDe(f.repCadena.ruta_archivo)}
              />
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
