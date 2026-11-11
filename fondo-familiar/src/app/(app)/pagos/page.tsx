import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { requerirPerfil } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fechaCorta, hoyColombia, mesLargo, pesos } from "@/lib/format";
import { resumenPrestamo } from "@/lib/cuentas";
import VisorImagen from "@/components/VisorImagen";
import FormularioPago from "./FormularioPago";
import FormularioPagoPrestamo from "./FormularioPagoPrestamo";

export default function Pagos({ searchParams }: PageProps<"/pagos">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

const ETIQUETA = {
  pendiente: ["En revisión", "bg-card-border text-muted"],
  aprobado: ["Aprobado", "bg-accent-soft text-accent"],
  rechazado: ["Rechazado", "bg-danger/15 text-danger"],
} as const;

async function Contenido({ searchParams }: { searchParams: PageProps<"/pagos">["searchParams"] }) {
  const perfil = await requerirPerfil();
  const supabase = await crearClienteServidor();

  const [{ data: cuotas }, { data: turnos }, { prestamo }] = await Promise.all([
    supabase
      .from("cuotas")
      .select("id, periodo, ahorro, cadena, juegos, estado")
      .eq("asociado_id", perfil.id)
      .order("periodo"),
    supabase.from("cadena_turnos").select("nombre_listado, fecha_reunion"),
    resumenPrestamo(perfil.id),
  ]);
  const todas = cuotas ?? [];
  const pendientes = todas.filter((c) => c.estado !== "pagada");
  const vigente = prestamo?.estado === "vigente" && "cuentas" in prestamo ? prestamo : null;
  const hoy = hoyColombia();
  const fechaDe = (periodo: string) =>
    (turnos ?? []).find((t) => t.fecha_reunion.slice(0, 7) === periodo.slice(0, 7))?.fecha_reunion ?? periodo;

  // Qué desea pagar: si solo hay una opción se muestra directo; si hay dos, se pregunta primero.
  const hayCuota = pendientes.length > 0;
  const params = await searchParams;
  const pedido = String(params.pago ?? "");
  const elegido: "cuota" | "prestamo" | null =
    pedido === "prestamo" && vigente ? "prestamo" : pedido === "cuota" && hayCuota ? "cuota" : hayCuota && vigente ? null : vigente ? "prestamo" : hayCuota ? "cuota" : null;
  const preguntar = elegido === null && hayCuota && !!vigente;
  const verPrestamo = elegido === "prestamo";
  // Solo la cuota inmediata (la más antigua sin pagar), no todas.
  const cuota = elegido === "cuota" ? pendientes[0] : undefined;

  // Comprobantes de la cuota elegida
  let reportes: { tipo: string; estado: "pendiente" | "aprobado" | "rechazado"; nota: string | null; url: string | null }[] = [];
  if (cuota) {
    const { data } = await supabase.from("pagos_reportados").select("tipo, estado, nota, ruta_archivo").eq("cuota_id", cuota.id);
    reportes = await Promise.all(
      (data ?? []).map(async (r) => {
        const { data: firmada } = await supabase.storage.from("comprobantes-pago").createSignedUrl(r.ruta_archivo, 3600);
        return { tipo: r.tipo, estado: r.estado, nota: r.nota, url: firmada?.signedUrl ?? null };
      }),
    );
  }
  const { data: filaBeneficiario } = cuota ? await supabase.rpc("beneficiario_cadena", { p_periodo: cuota.periodo }) : { data: null };
  const cuentaBeneficiario: string | null = filaBeneficiario?.[0]?.cuenta_pago ?? null;
  const reporteDe = (tipo: string) => reportes.find((r) => r.tipo === tipo) ?? null;
  const beneficiario = cuota
    ? turnos?.find((t) => t.fecha_reunion.slice(0, 7) === cuota.periodo.slice(0, 7))?.nombre_listado
    : null;

  // Pagos del préstamo reportados
  const { data: pagosPrestamo } =
    verPrestamo && vigente
      ? await supabase
          .from("pagos_prestamo")
          .select("id, monto_interes, monto_mora, monto_capital, estado, nota, creado_en, ruta_archivo")
          .eq("prestamo_id", vigente.id)
          .order("creado_en", { ascending: false })
          .limit(8)
      : { data: [] };
  const firmadasPrestamo = await Promise.all(
    (pagosPrestamo ?? []).map(async (r) => {
      const { data } = await supabase.storage.from("comprobantes-pago").createSignedUrl(r.ruta_archivo, 3600);
      return { ...r, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-accent underline">
        ← Inicio
      </Link>
      <h1 className="text-3xl font-extrabold tracking-tight">Registrar pago</h1>

      {!hayCuota && !vigente ? (
        <p className="rounded-[28px] bg-card p-5 text-muted">No tienes cuotas pendientes ni préstamo. ¡Estás al día!</p>
      ) : preguntar ? (
        <section className="space-y-3">
          <p className="text-muted">¿Qué deseas pagar?</p>
          {[
            { href: "/pagos?pago=cuota", titulo: "Cuota mensual", detalle: `${mesLargo(pendientes[0].periodo)} · vence ${fechaCorta(fechaDe(pendientes[0].periodo))}` },
            { href: "/pagos?pago=prestamo", titulo: "Préstamo", detalle: "Interés, abono o pago total" },
          ].map((o) => (
            <Link key={o.href} href={o.href} className="flex items-center justify-between rounded-[28px] bg-card p-5">
              <span>
                <span className="block text-lg font-bold">{o.titulo}</span>
                <span className="block text-sm text-muted">{o.detalle}</span>
              </span>
              <ArrowRight size={22} className="text-accent" />
            </Link>
          ))}
        </section>
      ) : (
        <>
          {hayCuota && vigente && (
            <Link href="/pagos" className="inline-block text-sm text-accent underline">
              Cambiar: pagar {verPrestamo ? "cuota" : "préstamo"}
            </Link>
          )}

          {verPrestamo && vigente && (
            <>
              <FormularioPagoPrestamo
                key={`prestamo-${firmadasPrestamo.length}`}
                c={{
                  saldoCapital: vigente.cuentas.saldoCapital,
                  interesPendiente: vigente.cuentas.interesPendiente,
                  moraPendiente: vigente.cuentas.moraPendiente,
                  interesMensual: vigente.cuentas.interesMensual,
                }}
              />
              {firmadasPrestamo.length > 0 && (
                <section className="space-y-2">
                  <h2 className="px-1 text-lg font-semibold">Mis pagos del préstamo</h2>
                  <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-4">
                    {firmadasPrestamo.map((r) => {
                      const [texto, clase] = ETIQUETA[r.estado as keyof typeof ETIQUETA];
                      const total = Number(r.monto_interes) + Number(r.monto_mora) + Number(r.monto_capital);
                      return (
                        <div key={r.id} className="space-y-1 py-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{pesos(total)}</p>
                            <span className={`rounded-full px-3 py-1 text-xs font-medium ${clase}`}>{texto}</span>
                          </div>
                          <p className="text-xs text-muted">
                            {fechaCorta(r.creado_en.slice(0, 10))} · interés {pesos(Number(r.monto_interes))}
                            {Number(r.monto_mora) > 0 && ` · mora ${pesos(Number(r.monto_mora))}`} · capital {pesos(Number(r.monto_capital))}
                          </p>
                          {r.estado === "rechazado" && (
                            <p className="text-xs text-danger">Rechazado{r.nota ? `: ${r.nota}` : ""}. Envía el pago de nuevo.</p>
                          )}
                          {r.url && <VisorImagen url={r.url} texto="Ver comprobante" />}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          {cuota && (
            <>
              <div className="rounded-[28px] bg-card p-5">
                <p className="text-sm text-muted">Cuota que debes pagar</p>
                <p className="text-2xl font-extrabold tracking-tight">{mesLargo(cuota.periodo)}</p>
                <p className={`text-sm ${fechaDe(cuota.periodo) < hoy ? "font-semibold text-danger" : "text-muted"}`}>
                  {fechaDe(cuota.periodo) < hoy ? "En mora desde" : "Vence"} el {fechaCorta(fechaDe(cuota.periodo))} · total{" "}
                  {pesos(Number(cuota.ahorro) + Number(cuota.cadena) + Number(cuota.juegos))}
                </p>
              </div>
              <p className="text-sm text-muted">
                Sube la captura de cada transferencia. Un administrador la revisa y, cuando la apruebe, tu cuota queda pagada.
              </p>

              <FormularioPago
                key={`${cuota.id}-fondo`}
                cuotaId={cuota.id}
                tipo="fondo"
                titulo="Pago al fondo"
                detalle="Ahorro + juegos, a la cuenta del fondo."
                monto={pesos(Number(cuota.ahorro) + Number(cuota.juegos))}
                reporte={reporteDe("fondo")}
              />

              {Number(cuota.cadena) > 0 ? (
                <FormularioPago
                  key={`${cuota.id}-cadena`}
                  cuotaId={cuota.id}
                  tipo="cadena"
                  titulo="Pago de la cadena"
                  detalle={
                    (beneficiario
                      ? `Se paga directamente a ${beneficiario}, quien tiene el turno este mes.`
                      : "Se paga a quien tiene el turno este mes.") +
                    (cuentaBeneficiario ? ` Cuenta: ${cuentaBeneficiario}` : " Aún no ha registrado su cuenta; consúltala con un administrador.")
                  }
                  monto={pesos(Number(cuota.cadena))}
                  reporte={reporteDe("cadena")}
                />
              ) : (
                <p className="rounded-[28px] bg-card p-5 text-sm text-muted">Este mes tienes el turno de la cadena: no pagas esa parte.</p>
              )}

              <section className="space-y-2 pt-2">
                <h2 className="px-1 text-lg font-semibold">Resumen de mis cuotas</h2>
                <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-4">
                  {todas.map((c) => {
                    const pagada = c.estado === "pagada";
                    const vencida = !pagada && fechaDe(c.periodo) < hoy;
                    return (
                      <div key={c.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium">{mesLargo(c.periodo)}</p>
                          <p className="text-xs text-muted">
                            {pesos(Number(c.ahorro) + Number(c.cadena) + Number(c.juegos))} · {pagada ? "pagada" : `vence ${fechaCorta(fechaDe(c.periodo))}`}
                          </p>
                        </div>
                        {pagada ? (
                          <span className="flex items-center gap-1 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                            <Check size={14} /> Pagada
                          </span>
                        ) : (
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${vencida ? "bg-danger/15 text-danger" : "bg-card-border text-muted"}`}>
                            {vencida ? "En mora" : "Debes"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
