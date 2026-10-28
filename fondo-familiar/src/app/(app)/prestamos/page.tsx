import { Suspense } from "react";
import { requerirPerfil } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { cuentasPrestamo } from "@/lib/prestamos";
import { fechaCorta, hoyColombia, pesos } from "@/lib/format";
import FormularioSolicitud from "./FormularioSolicitud";

export default function Prestamos() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Contenido />
    </Suspense>
  );
}

const ETIQUETA: Record<string, string> = {
  radicado: "En votación",
  aprobado: "Aprobado, esperando desembolso",
  vigente: "Vigente",
  rechazado: "Rechazado",
  pagado: "Pagado",
};
const MOV: Record<string, string> = {
  desembolso: "Desembolso",
  interes: "Pago de interés",
  abono_capital: "Abono a capital",
  interes_mora: "Pago de interés de mora",
};

async function Contenido() {
  const perfil = await requerirPerfil();
  const supabase = await crearClienteServidor();

  const [{ data: prestamos }, { data: params }, { data: turnos }, { data: caja }] = await Promise.all([
    supabase
      .from("prestamos")
      .select("id, monto, estado, radicado_en, desembolsado_en")
      .eq("asociado_id", perfil.id)
      .order("radicado_en", { ascending: false }),
    supabase.from("parametros").select("clave, valor").in("clave", ["interes_prestamo_pct", "interes_mora_pct", "tope_prestamo"]),
    supabase.from("cadena_turnos").select("fecha_reunion"),
    supabase.rpc("caja_disponible"),
  ]);

  const p = Object.fromEntries((params ?? []).map((x) => [x.clave, Number(x.valor)]));
  const lista = prestamos ?? [];
  const enCurso = lista.find((x) => ["radicado", "aprobado", "vigente"].includes(x.estado));
  const hoy = hoyColombia();
  const puedePedir = Math.min(p.tope_prestamo ?? 1_000_000, Math.max(0, Number(caja ?? 0)));

  const posicion = enCurso && enCurso.estado !== "vigente" ? await supabase.rpc("posicion_cola", { p_prestamo: enCurso.id }) : null;

  const { data: movs } = enCurso
    ? await supabase
        .from("movimientos_prestamo")
        .select("tipo, monto, fecha")
        .eq("prestamo_id", enCurso.id)
        .order("fecha", { ascending: false })
    : { data: [] };

  const cuentas = enCurso
    ? cuentasPrestamo(
        enCurso.desembolsado_en,
        movs ?? [],
        (turnos ?? []).map((t) => t.fecha_reunion),
        hoy,
        { interes: p.interes_prestamo_pct ?? 4, mora: p.interes_mora_pct ?? 4 },
      )
    : null;

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">Préstamos</h1>

      {!enCurso && (
        <>
          <p className="text-sm text-muted">
            Hay {pesos(puedePedir)} disponibles para prestar (tope {pesos(p.tope_prestamo ?? 1_000_000)}). Si no alcanza, tu
            solicitud queda en cola por orden de radicación.
          </p>
          <FormularioSolicitud />
        </>
      )}

      {enCurso && (
        <section className="space-y-3 rounded-3xl bg-gradient-to-br from-accent to-[#4a1d99] p-6 text-accent-fg shadow-lg">
          <p className="text-sm opacity-80">{ETIQUETA[enCurso.estado]}</p>
          {enCurso.estado === "vigente" && cuentas ? (
            <>
              <p className="text-4xl font-bold tracking-tight">{pesos(cuentas.saldoCapital)}</p>
              <p className="text-sm opacity-80">saldo de capital · inicial {pesos(cuentas.capitalInicial)}</p>
              <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                <Dato titulo="Interés mensual fijo" valor={pesos(cuentas.interesMensual)} />
                <Dato titulo="Interés pendiente" valor={pesos(cuentas.interesPendiente)} />
                <Dato titulo="Mora estimada" valor={pesos(cuentas.moraPendiente)} />
                <Dato titulo="Desembolso" valor={enCurso.desembolsado_en ? fechaCorta(enCurso.desembolsado_en) : "—"} />
              </div>
              <p className="text-xs opacity-70">El interés vence cada día de reunión. La mora es una estimación provisional.</p>
            </>
          ) : (
            <>
              <p className="text-4xl font-bold tracking-tight">{pesos(Number(enCurso.monto))}</p>
              {posicion?.data != null && (
                <p className="text-sm opacity-80">Posición en la cola: {String(posicion.data)}</p>
              )}
            </>
          )}
        </section>
      )}

      {enCurso && (movs ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Movimientos</h2>
          {(movs ?? []).map((m, i) => (
            <div key={i} className="flex justify-between rounded-2xl border border-card-border bg-card p-3 text-sm">
              <div>
                <p>{MOV[m.tipo] ?? m.tipo}</p>
                <p className="text-xs text-muted">{fechaCorta(m.fecha)}</p>
              </div>
              <p className="font-semibold">{pesos(Number(m.monto))}</p>
            </div>
          ))}
        </section>
      )}

      {lista.filter((x) => x !== enCurso).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Historial</h2>
          {lista
            .filter((x) => x !== enCurso)
            .map((x) => (
              <div key={x.id} className="flex justify-between rounded-2xl border border-card-border bg-card p-3 text-sm">
                <div>
                  <p>{pesos(Number(x.monto))}</p>
                  <p className="text-xs text-muted">{fechaCorta(x.radicado_en.slice(0, 10))}</p>
                </div>
                <p className="text-muted">{ETIQUETA[x.estado]}</p>
              </div>
            ))}
        </section>
      )}
    </div>
  );
}

function Dato({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div>
      <p className="opacity-70">{titulo}</p>
      <p className="font-semibold">{valor}</p>
    </div>
  );
}
