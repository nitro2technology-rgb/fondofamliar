import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock, Landmark, Phone, TriangleAlert } from "lucide-react";
import Avatar from "@/components/Avatar";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { cuentasPrestamo } from "@/lib/prestamos";
import { fechaCorta, hoyColombia, mesLargo, pesos } from "@/lib/format";
import SubirPagoPrestamoAdmin from "../../pagos/SubirPagoPrestamoAdmin";

export default function Socio({ params }: PageProps<"/admin/socio/[id]">) {
  return (
    <Suspense fallback={<main className="flex-1 px-4 pt-6 text-muted">Cargando…</main>}>
      <Contenido params={params} />
    </Suspense>
  );
}

const TIPO_MOV: Record<string, string> = {
  desembolso: "Desembolso",
  interes: "Pago de interés",
  interes_mora: "Pago de mora",
  abono_capital: "Abono a capital",
};

async function Contenido({ params }: { params: PageProps<"/admin/socio/[id]">["params"] }) {
  await requerirAdmin();
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();

  const { data: perfil } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, celular, ciudad, correo")
    .eq("id", id)
    .maybeSingle();
  if (!perfil) notFound();

  const [cuotas, turnos, aportes, prestamos, multas, asistencias, parametros] = await Promise.all([
    supabase.from("cuotas").select("periodo, ahorro, cadena, juegos, estado, fecha_pago").eq("asociado_id", id).order("periodo"),
    supabase.from("cadena_turnos").select("asociado_id, turno, fecha_reunion").order("turno"),
    supabase.from("aportes_unicos").select("tipo, monto, fecha_pago").eq("asociado_id", id),
    supabase
      .from("prestamos")
      .select("id, monto, estado, radicado_en, desembolsado_en")
      .eq("asociado_id", id)
      .order("radicado_en", { ascending: false }),
    supabase.from("multas").select("motivo, monto, pagada, reuniones(fecha)").eq("asociado_id", id),
    supabase.from("asistencias").select("estado").eq("asociado_id", id),
    supabase.from("parametros").select("clave, valor").in("clave", ["interes_prestamo_pct", "interes_mora_pct"]),
  ]);

  const lista = turnos.data ?? [];
  const reuniones = lista.map((t) => t.fecha_reunion);
  const miTurno = lista.find((t) => t.asociado_id === id);
  const fechaDe = (periodo: string) => lista.find((t) => t.fecha_reunion.slice(0, 7) === periodo.slice(0, 7))?.fecha_reunion ?? periodo;
  const p = Object.fromEntries((parametros.data ?? []).map((x) => [x.clave, Number(x.valor)]));

  const ids = (prestamos.data ?? []).map((x) => x.id);
  const { data: movs } = ids.length
    ? await supabase.from("movimientos_prestamo").select("prestamo_id, tipo, monto, fecha").in("prestamo_id", ids).order("fecha", { ascending: false })
    : { data: [] };

  const pagadas = (cuotas.data ?? []).filter((c) => c.estado === "pagada");
  const totalCuotas = pagadas.reduce((s, c) => s + Number(c.ahorro) + Number(c.cadena) + Number(c.juegos), 0);
  const multasPend = (multas.data ?? []).filter((m) => !m.pagada).reduce((s, m) => s + Number(m.monto), 0);
  const cuenta = (a: string) => (asistencias.data ?? []).filter((x) => x.estado === a).length;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 py-6">
      <Link href="/admin" className="text-sm text-accent underline">
        ← Resumen
      </Link>

      <header className="flex items-center gap-4">
        <Avatar nombre={perfil.nombre} size={64} />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight tracking-tight">{perfil.nombre}</h1>
          <p className="text-sm capitalize text-muted">
            {perfil.rol === "asociado" ? "Asociado" : perfil.rol}
            {perfil.ciudad && ` · ${perfil.ciudad}`}
            {miTurno && ` · turno ${miTurno.turno}`}
          </p>
          {perfil.celular && (
            <a href={`tel:${perfil.celular}`} className="mt-1 inline-flex items-center gap-1 text-xs text-accent">
              <Phone size={12} /> {perfil.celular}
            </a>
          )}
        </div>
      </header>

      <section className="grid grid-cols-3 gap-2 text-center">
        <Dato t="Cuotas pagadas" v={`${pagadas.length}/${(cuotas.data ?? []).length}`} />
        <Dato t="Aportó en cuotas" v={pesos(totalCuotas)} />
        <Dato t="Multas pendientes" v={pesos(multasPend)} alerta={multasPend > 0} />
      </section>

      {/* Préstamos */}
      <section className="space-y-3">
        <h2 className="px-1 text-lg font-semibold">Préstamos</h2>
        {(prestamos.data ?? []).length === 0 && (
          <p className="rounded-[28px] bg-card p-5 text-sm text-muted">Nunca ha solicitado un préstamo.</p>
        )}
        {(prestamos.data ?? []).map((x) => {
          const m = (movs ?? []).filter((o) => o.prestamo_id === x.id);
          const c = cuentasPrestamo(x.desembolsado_en, m, reuniones, hoy, { interes: p.interes_prestamo_pct ?? 4, mora: p.interes_mora_pct ?? 4 });
          const suma = (t: string) => m.filter((o) => o.tipo === t).reduce((s, o) => s + Number(o.monto), 0);
          const vigente = x.estado === "vigente";
          return (
            <div key={x.id} className="space-y-4 rounded-[28px] bg-card p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-full bg-accent-soft text-accent">
                    <Landmark size={22} />
                  </span>
                  <div>
                    <p className="text-xl font-bold">{pesos(Number(x.monto))}</p>
                    <p className="text-xs text-muted">
                      Solicitado el {fechaCorta(x.radicado_en.slice(0, 10))}
                      {x.desembolsado_en && ` · desembolsado el ${fechaCorta(x.desembolsado_en)}`}
                    </p>
                  </div>
                </div>
                <Estado estado={x.estado} />
              </div>

              {x.desembolsado_en && (
                <>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <Dato t="Intereses pagados" v={pesos(suma("interes"))} fondo />
                    <Dato t="Capital abonado" v={pesos(suma("abono_capital"))} fondo />
                    <Dato t="Saldo capital" v={pesos(c.saldoCapital)} fondo />
                  </div>
                  {vigente && (
                    <p className={`rounded-2xl px-4 py-3 text-sm ${c.interesPendiente + c.moraPendiente > 0 ? "bg-danger/10 text-danger" : "bg-accent-soft text-accent"}`}>
                      {c.interesPendiente + c.moraPendiente > 0
                        ? `Debe ${pesos(c.interesPendiente)} de interés${c.moraPendiente > 0 ? ` y ${pesos(c.moraPendiente)} de mora` : ""}.`
                        : "Está al día con los intereses."}
                    </p>
                  )}
                  {m.length > 0 && (
                    <div>
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Movimientos</p>
                      <div className="divide-y divide-card-border/60">
                        {m.map((o, i) => (
                          <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                            <div>
                              <p className="font-medium">{TIPO_MOV[o.tipo] ?? o.tipo}</p>
                              <p className="text-xs text-muted">{fechaCorta(o.fecha)}</p>
                            </div>
                            <p className={`font-semibold ${o.tipo === "desembolso" ? "" : "text-ok"}`}>
                              {o.tipo === "desembolso" ? "" : "+"}
                              {pesos(Number(o.monto))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {vigente && (
                    <div className="flex">
                      <SubirPagoPrestamoAdmin prestamoId={x.id} interes={c.interesPendiente} mora={c.moraPendiente} />
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </section>

      {/* Cuotas */}
      <section className="space-y-2">
        <h2 className="px-1 text-lg font-semibold">Cuotas mensuales</h2>
        <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-2">
          {(cuotas.data ?? []).map((c) => {
            const pagada = c.estado === "pagada";
            const vencida = fechaDe(c.periodo) < hoy;
            return (
              <div key={c.periodo} className="flex items-center gap-3 px-2 py-3">
                <span
                  className={`flex size-8 items-center justify-center rounded-full ${
                    pagada ? "bg-accent text-accent-fg" : vencida ? "bg-danger/15 text-danger" : "bg-card-border text-muted"
                  }`}
                >
                  {pagada ? <Check size={16} /> : vencida ? <TriangleAlert size={15} /> : <Clock size={15} />}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{mesLargo(c.periodo)}</p>
                  <p className="text-xs text-muted">
                    {pagada && c.fecha_pago ? `Pagada el ${fechaCorta(c.fecha_pago)}` : vencida ? "En mora" : "Pendiente"}
                    {Number(c.cadena) === 0 && " · su turno de cadena"}
                  </p>
                </div>
                <p className="text-sm font-semibold">{pesos(Number(c.ahorro) + Number(c.cadena) + Number(c.juegos))}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Aportes, multas y asistencia */}
      <section className="space-y-2">
        <h2 className="px-1 text-lg font-semibold">Otros aportes y multas</h2>
        <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-4">
          {(aportes.data ?? []).map((a) => (
            <Fila key={a.tipo} t={a.tipo === "inicial" ? "Aporte inicial" : "Aporte tecnológico"} n={fechaCorta(a.fecha_pago)} v={pesos(Number(a.monto))} />
          ))}
          {(multas.data ?? []).map((m, i) => (
            <Fila
              key={i}
              t={m.motivo}
              n={`${(m.reuniones as unknown as { fecha: string } | null)?.fecha ?? ""} · ${m.pagada ? "pagada" : "pendiente"}`}
              v={pesos(Number(m.monto))}
              alerta={!m.pagada}
            />
          ))}
          <Fila t="Asistencia" n="Reuniones registradas" v={`${cuenta("puntual")} puntual · ${cuenta("tarde")} tarde · ${cuenta("ausente")} aus.`} />
        </div>
      </section>
    </main>
  );
}

function Dato({ t, v, alerta, fondo }: { t: string; v: string; alerta?: boolean; fondo?: boolean }) {
  return (
    <div className={`rounded-2xl px-2 py-3 ${fondo ? "bg-background" : "bg-card"}`}>
      <p className={`text-base font-bold ${alerta ? "text-danger" : ""}`}>{v}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-muted">{t}</p>
    </div>
  );
}

function Fila({ t, n, v, alerta }: { t: string; n: string; v: string; alerta?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 text-sm">
      <div>
        <p className="font-medium">{t}</p>
        <p className="text-xs text-muted">{n}</p>
      </div>
      <p className={`text-right font-semibold ${alerta ? "text-danger" : ""}`}>{v}</p>
    </div>
  );
}

function Estado({ estado }: { estado: string }) {
  const mapa: Record<string, [string, string]> = {
    radicado: ["En votación", "bg-card-border text-muted"],
    aprobado: ["Aprobado", "bg-accent-soft text-accent"],
    vigente: ["Vigente", "bg-accent text-accent-fg"],
    pagado: ["Pagado", "bg-ok/15 text-ok"],
    rechazado: ["Rechazado", "bg-danger/15 text-danger"],
  };
  const [texto, clase] = mapa[estado] ?? [estado, "bg-card-border text-muted"];
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${clase}`}>{texto}</span>;
}
