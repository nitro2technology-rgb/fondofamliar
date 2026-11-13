import { Suspense } from "react";
import Link from "next/link";
import { Check, ThumbsDown, ThumbsUp, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import BotonEnvio from "@/components/BotonEnvio";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { desembolsarPrestamo, votarPrestamo } from "@/lib/acciones";
import { cuentasPrestamo } from "@/lib/prestamos";
import { fechaCorta, hoyColombia, pesos } from "@/lib/format";

export default function PrestamosAdmin({ searchParams }: PageProps<"/admin/prestamos">) {
  return (
    <Suspense fallback={<main className="flex-1 px-4 pt-6 text-muted">Cargando…</main>}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

type Vista = "cola" | "vigentes" | "historial";

async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/prestamos">["searchParams"] }) {
  const yo = await requerirAdmin();
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();

  const [{ data: activos }, { data: historial }, { data: votos }, { data: movs }, { data: params }, { data: caja }, { data: admins }, { data: multasPend }] =
    await Promise.all([
      supabase
        .from("prestamos")
        .select("id, asociado_id, monto, estado, radicado_en, desembolsado_en, cobrar_4x1000, perfiles!prestamos_asociado_id_fkey(nombre), externos(nombre)")
        .in("estado", ["radicado", "aprobado", "vigente"])
        .order("radicado_en"),
      supabase
        .from("prestamos")
        .select("id, asociado_id, monto, estado, radicado_en, perfiles!prestamos_asociado_id_fkey(nombre)")
        .in("estado", ["pagado", "rechazado"])
        .order("radicado_en", { ascending: false })
        .limit(20),
      supabase.from("votos_prestamo").select("prestamo_id, admin_id, voto"),
      supabase.from("movimientos_prestamo").select("prestamo_id, tipo, monto, fecha"),
      supabase.from("parametros").select("clave, valor").in("clave", ["interes_prestamo_pct", "interes_mora_pct"]),
      supabase.rpc("caja_disponible"),
      supabase.from("perfiles").select("id, nombre").in("rol", ["tesorero", "contador", "fiscal"]).eq("activo", true).order("nombre"),
      supabase.from("multas").select("asociado_id, monto").eq("pagada", false),
    ]);

  const p = Object.fromEntries((params ?? []).map((x) => [x.clave, Number(x.valor)]));
  const nombreDe = (x: { perfiles: unknown }) => (x.perfiles as { nombre: string } | null)?.nombre ?? "";
  const cuentasDe = (x: { id: string; desembolsado_en: string | null; cobrar_4x1000: boolean }) =>
    cuentasPrestamo(x.desembolsado_en, (movs ?? []).filter((o) => o.prestamo_id === x.id), hoy, {
      interes: p.interes_prestamo_pct ?? 4,
      mora: p.interes_mora_pct ?? 4,
    }, x.cobrar_4x1000);

  const multasDe = (id: string) =>
    (multasPend ?? []).filter((m) => m.asociado_id === id).reduce((s, m) => s + Number(m.monto), 0);

  const cola = (activos ?? []).filter((x) => x.estado !== "vigente");
  const vigentes = (activos ?? []).filter((x) => x.estado === "vigente");
  const pedida = String((await searchParams).vista ?? "");
  const vista: Vista = pedida === "vigentes" || pedida === "historial" || pedida === "cola" ? pedida : cola.length ? "cola" : "vigentes";

  const cajaLibre = Number(caja ?? 0); // ya descuenta lo aprobado sin desembolsar
  const porCobrar = vigentes.reduce((s, x) => {
    const c = cuentasDe(x);
    return s + c.interesPendiente + c.moraPendiente;
  }, 0);
  const enCartera = vigentes.reduce((s, x) => s + cuentasDe(x).saldoCapital, 0);

  const href = (v: Vista) => `/admin/prestamos?vista=${v}`;
  // Monto acumulado de las solicitudes en votación, en orden de llegada, para saber hasta dónde alcanza la caja.
  const acumulados = new Map<string, number>();
  cola.filter((x) => x.estado === "radicado").reduce((suma, x) => {
    acumulados.set(x.id, suma + Number(x.monto));
    return suma + Number(x.monto);
  }, 0);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6">
      <Link href="/admin" className="text-sm text-accent underline">
        ← Resumen
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Préstamos</h1>

      <section className="grid grid-cols-3 gap-2 text-center">
        <Dato t="Disponible" v={pesos(Math.max(0, cajaLibre))} destacado />
        <Dato t="En préstamo" v={pesos(enCartera)} />
        <Dato t="Por cobrar" v={pesos(porCobrar)} />
      </section>

      <div className="flex gap-1 rounded-full bg-card p-1">
        {(
          [
            ["cola", `Cola (${cola.length})`],
            ["vigentes", `Vigentes (${vigentes.length})`],
            ["historial", "Historial"],
          ] as const
        ).map(([v, t]) => (
          <Link
            key={v}
            href={href(v)}
            className={`flex-1 rounded-full px-2 py-2 text-center text-sm font-semibold ${v === vista ? "bg-accent text-accent-fg" : "text-muted"}`}
          >
            {t}
          </Link>
        ))}
      </div>

      {/* ───── Cola de solicitudes (la cadena de préstamos) ───── */}
      {vista === "cola" && (
        <section className="space-y-1">
          {cola.length === 0 && <p className="rounded-[28px] bg-card p-5 text-sm text-muted">No hay solicitudes pendientes.</p>}
          <ol className="relative space-y-4">
            {cola.length > 1 && <span className="absolute bottom-6 left-[21px] top-6 w-0.5 bg-card-border" aria-hidden />}
            {cola.map((x, i) => {
              const v = (votos ?? []).filter((o) => o.prestamo_id === x.id);
              const miVoto = v.find((o) => o.admin_id === yo.id);
              const aFavor = v.filter((o) => o.voto === "aprobar").length;
              const enContra = v.filter((o) => o.voto === "rechazar").length;
              const aprobado = x.estado === "aprobado";
              const acumulado = acumulados.get(x.id) ?? 0;
              const hayCaja = aprobado || acumulado <= cajaLibre;
              const nombre = nombreDe(x);
              const externo = (x.externos as unknown as { nombre: string } | null)?.nombre;

              return (
                <li key={x.id} className="relative flex gap-3">
                  <span
                    className={`relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                      i === 0 ? "bg-accent text-accent-fg shadow-lg shadow-accent/40" : "bg-card text-muted ring-1 ring-card-border"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-3 rounded-[28px] bg-card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/admin/socio/${x.asociado_id}`} className="flex min-w-0 items-center gap-2.5">
                        <Avatar nombre={nombre} size={36} />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{nombre}</span>
                          <span className="block text-xs text-muted">
                            {fechaCorta(x.radicado_en.slice(0, 10))}
                            {externo && ` · para ${externo}`}
                          </span>
                        </span>
                      </Link>
                      <p className="text-lg font-extrabold">{pesos(Number(x.monto))}</p>
                    </div>

                    {x.estado === "radicado" && (
                      <>
                        <div className="flex items-center gap-2">
                          {admins?.map((a) => {
                            const o = v.find((w) => w.admin_id === a.id);
                            return (
                              <span
                                key={a.id}
                                title={`${a.nombre}: ${o ? o.voto : "sin votar"}`}
                                className={`flex size-7 items-center justify-center rounded-full text-[11px] font-bold ${
                                  o?.voto === "aprobar"
                                    ? "bg-accent text-accent-fg"
                                    : o?.voto === "rechazar"
                                      ? "bg-danger text-white"
                                      : "bg-background text-muted ring-1 ring-card-border"
                                }`}
                              >
                                {o?.voto === "aprobar" ? <Check size={14} /> : o?.voto === "rechazar" ? <X size={14} /> : a.nombre.charAt(0)}
                              </span>
                            );
                          })}
                          <span className="text-xs text-muted">
                            {aFavor} a favor · {enContra} en contra · se decide con 2
                          </span>
                        </div>
                        {!hayCaja && (
                          <p className="rounded-xl bg-danger/10 px-3 py-2 text-xs text-danger">
                            Hoy no alcanza la caja para esta posición (acumulado {pesos(acumulado)}).
                          </p>
                        )}
                        {miVoto ? (
                          <p className="text-sm text-muted">Tu voto: {miVoto.voto === "aprobar" ? "aprobar" : "rechazar"}</p>
                        ) : (
                          <form action={votarPrestamo} className="grid grid-cols-2 gap-2">
                            <input type="hidden" name="id" value={x.id} />
                            <button
                              name="voto"
                              value="aprobar"
                              className="flex items-center justify-center gap-2 rounded-full bg-accent py-3 text-sm font-semibold text-accent-fg"
                            >
                              <ThumbsUp size={16} /> Aprobar
                            </button>
                            <button
                              name="voto"
                              value="rechazar"
                              className="flex items-center justify-center gap-2 rounded-full bg-background py-3 text-sm font-semibold text-danger"
                            >
                              <ThumbsDown size={16} /> Rechazar
                            </button>
                          </form>
                        )}
                      </>
                    )}

                    {aprobado && (
                      <form action={desembolsarPrestamo} className="space-y-2">
                        <input type="hidden" name="id" value={x.id} />
                        <p className="text-xs text-ok">Aprobado por los directivos. Falta entregar el dinero.</p>
                        {multasDe(x.asociado_id) > 0 && (
                          <p className="rounded-2xl bg-danger/15 px-3 py-2 text-xs text-danger">
                            Tiene {pesos(multasDe(x.asociado_id))} en multas pendientes: no se puede desembolsar hasta que las pague.
                          </p>
                        )}
                        <BotonEnvio
                          enviando="Registrando…"
                          disabled={multasDe(x.asociado_id) > 0}
                          className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-fg disabled:opacity-40"
                        >
                          Registrar desembolso
                        </BotonEnvio>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* ───── Vigentes ───── */}
      {vista === "vigentes" && (
        <section className="space-y-3">
          {vigentes.length === 0 && <p className="rounded-[28px] bg-card p-5 text-sm text-muted">No hay préstamos vigentes.</p>}
          {vigentes.map((x) => {
            const c = cuentasDe(x);
            const nombre = nombreDe(x);
            const debe = c.interesPendiente + c.moraPendiente;
            return (
              <div key={x.id} className="space-y-3 rounded-[28px] bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link href={`/admin/socio/${x.asociado_id}`} className="flex min-w-0 items-center gap-2.5">
                    <Avatar nombre={nombre} size={40} />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{nombre}</span>
                      <span className="block text-xs text-muted">Desde {x.desembolsado_en ? fechaCorta(x.desembolsado_en) : "—"}</span>
                    </span>
                  </Link>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      c.moraPendiente > 0 ? "bg-danger/15 text-danger" : debe > 0 ? "bg-amber/15 text-amber" : "bg-accent-soft text-accent"
                    }`}
                  >
                    {c.moraPendiente > 0 ? "En mora" : debe > 0 ? `Debe ${pesos(debe)}` : "Al día"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Dato t="Saldo capital" v={pesos(c.saldoCapital)} fondo />
                  <Dato t="Interés mes" v={pesos(c.interesMensual)} fondo />
                  <Dato t="Interés pend." v={pesos(c.interesPendiente)} fondo />
                </div>
                <Link
                  href="/admin/pagos?tipo=prestamo"
                  className="block rounded-full bg-background py-2.5 text-center text-xs font-semibold"
                >
                  Registrar pago con comprobante
                </Link>
              </div>
            );
          })}
        </section>
      )}

      {/* ───── Historial ───── */}
      {vista === "historial" && (
        <section className="space-y-2">
          {(historial ?? []).length === 0 && <p className="rounded-[28px] bg-card p-5 text-sm text-muted">Aún no hay préstamos cerrados.</p>}
          <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-2">
            {(historial ?? []).map((x) => (
              <Link key={x.id} href={`/admin/socio/${x.asociado_id}`} className="flex items-center gap-3 px-2 py-3.5">
                <Avatar nombre={nombreDe(x)} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{nombreDe(x)}</p>
                  <p className="text-xs text-muted">{fechaCorta(x.radicado_en.slice(0, 10))}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{pesos(Number(x.monto))}</p>
                  <p className={`text-xs ${x.estado === "pagado" ? "text-ok" : "text-danger"}`}>{x.estado === "pagado" ? "Pagado" : "Rechazado"}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function Dato({ t, v, destacado, fondo }: { t: string; v: string; destacado?: boolean; fondo?: boolean }) {
  return (
    <div className={`rounded-2xl px-2 py-3 ${destacado ? "bg-accent text-accent-fg" : fondo ? "bg-background" : "bg-card"}`}>
      <p className="text-base font-bold">{v}</p>
      <p className={`mt-0.5 text-[11px] leading-tight ${destacado ? "opacity-80" : "text-muted"}`}>{t}</p>
    </div>
  );
}
