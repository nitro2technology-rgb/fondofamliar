import { Suspense } from "react";
import { requerirPerfil } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { cuentasPrestamo } from "@/lib/prestamos";
import { fechaCorta, hoyColombia, pesos } from "@/lib/format";
import Link from "next/link";
import TarjetaPrestamo from "@/components/TarjetaPrestamo";
import SolicitudRapida from "@/components/SolicitudRapida";
import FormularioSolicitud from "./FormularioSolicitud";
import { estadoDeCuenta } from "@/lib/cuentas";
import { Lock } from "lucide-react";

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
  reembolso_4x1000: "Reembolso del 4x1000",
};

async function Contenido() {
  const perfil = await requerirPerfil();
  const supabase = await crearClienteServidor();

  const [{ data: prestamos }, { data: params }, { data: caja }] = await Promise.all([
    supabase
      .from("prestamos")
      .select("id, monto, estado, radicado_en, desembolsado_en, cobrar_4x1000")
      .eq("asociado_id", perfil.id)
      .order("radicado_en", { ascending: false }),
    supabase.from("parametros").select("clave, valor").in("clave", ["interes_prestamo_pct", "interes_mora_pct", "tope_prestamo"]),
    supabase.rpc("caja_disponible"),
  ]);

  const p = Object.fromEntries((params ?? []).map((x) => [x.clave, Number(x.valor)]));
  const lista = prestamos ?? [];
  const enCurso = lista.find((x) => ["radicado", "aprobado", "vigente"].includes(x.estado));
  const hoy = hoyColombia();
  const puedePedir = Math.min(p.tope_prestamo ?? 1_000_000, Math.max(0, Number(caja ?? 0)));

  const cuenta = enCurso ? null : await estadoDeCuenta(perfil.id);
  const bloqueoMultas = (cuenta?.multasPendientes ?? 0) > 0;
  const bloqueoMora = cuenta?.cuota?.estado === "En mora";

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
        hoy,
        { interes: p.interes_prestamo_pct ?? 4, mora: p.interes_mora_pct ?? 4 },
        enCurso.cobrar_4x1000,
      )
    : null;

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">Préstamos</h1>

      {!enCurso && (bloqueoMultas || bloqueoMora) && (
        <section className="space-y-3 rounded-[28px] border-2 border-danger bg-card p-5">
          <p className="flex items-center gap-2 font-bold text-danger">
            <Lock size={18} /> Solicitud bloqueada
          </p>
          {bloqueoMultas && cuenta && (
            <div className="space-y-1 text-sm">
              <p>Debes {pesos(cuenta.multasPendientes)} en multas:</p>
              {cuenta.multas.map((m, i) => (
                <p key={i} className="text-muted">
                  {m.motivo}
                  {m.fecha && ` · ${fechaCorta(m.fecha)}`} · {pesos(m.monto)}
                </p>
              ))}
              <p className="pt-1 text-muted">Págalas a un directivo; cuando las marque como cobradas se desbloquea.</p>
            </div>
          )}
          {bloqueoMora && (
            <p className="text-sm">
              Tu cuota está en mora. <Link href="/pagos" className="font-semibold text-accent">Súbela aquí</Link> para poder pedir.
            </p>
          )}
        </section>
      )}

      {!enCurso && !bloqueoMultas && !bloqueoMora && (
        <>
          <p className="text-sm text-muted">
            Hay {pesos(puedePedir)} disponibles para prestar (tope {pesos(p.tope_prestamo ?? 1_000_000)}). Si no alcanza, tu
            solicitud queda en cola por orden de radicación.
          </p>
          <SolicitudRapida caja={Math.max(0, Number(caja ?? 0))} tope={p.tope_prestamo ?? 1_000_000} />
          <details className="rounded-[28px] bg-card p-4">
            <summary className="cursor-pointer text-sm font-semibold">Solicitar para un externo que apadrino</summary>
            <div className="pt-3">
              <FormularioSolicitud />
            </div>
          </details>
        </>
      )}

      {enCurso && (
        <section className="space-y-4">
          {enCurso.estado === "vigente" && cuentas ? (
            <>
              <TarjetaPrestamo
                etiqueta="Tu préstamo"
                valor={pesos(cuentas.saldoCapital)}
                titular={perfil.nombre}
                izquierda={{ titulo: "Interés mensual", valor: pesos(cuentas.interesMensual) }}
                derecha={{ titulo: "Inicial", valor: pesos(cuentas.capitalInicial) }}
              />
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <Dato titulo="Interés pendiente" valor={pesos(cuentas.interesPendiente)} />
                <Dato titulo="Mora estimada" valor={pesos(cuentas.moraPendiente)} />
                <Dato titulo="Próximo pago" valor={cuentas.proximoPago ? fechaCorta(cuentas.proximoPago) : "—"} />
              </div>
              <Link
                href="/pagos?pago=prestamo"
                className="flex items-center justify-center rounded-full bg-accent py-4 font-semibold text-accent-fg"
              >
                Abonar o pagar interés
              </Link>
              <p className="text-xs text-muted">
                El interés vence cada mes, el mismo día en que se te habilitó el préstamo, y se paga hasta cancelar todo el capital.{cuentas.primeraCuotaPendiente ? ` La primera cuota incluye el 4x1000 (${pesos(cuentas.cuatroPorMil)}), que solo se paga una vez.` : ""} Puedes abonar a capital cuando quieras y por
                cualquier valor. Al cancelarlo por completo quedas libre para pedir otro préstamo. La mora es una estimación provisional.
              </p>
            </>
          ) : (
            <>
              <TarjetaPrestamo
                etiqueta={ETIQUETA[enCurso.estado]}
                valor={pesos(Number(enCurso.monto))}
                titular={perfil.nombre}
                izquierda={posicion?.data != null ? { titulo: "Posición en la cola", valor: String(posicion.data) } : undefined}
              />
            </>
          )}
        </section>
      )}

      {enCurso && (movs ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Movimientos</h2>
          {(movs ?? []).map((m, i) => (
            <div key={i} className="flex justify-between rounded-2xl bg-card p-4 text-sm">
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
              <div key={x.id} className="flex justify-between rounded-2xl bg-card p-4 text-sm">
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
    <div className="rounded-2xl bg-card px-2 py-3">
      <p className="text-xs text-muted">{titulo}</p>
      <p className="font-semibold">{valor}</p>
    </div>
  );
}
