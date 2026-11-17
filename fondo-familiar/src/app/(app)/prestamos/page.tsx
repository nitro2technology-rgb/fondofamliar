import { Suspense } from "react";
import { requerirPerfil } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { clienteAdmin } from "@/lib/supabase/admin";
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
  // Lo que los directivos escribieron al aprobar o rechazar (los votos no los lee el asociado directamente).
  const { data: comentarios } = lista.length
    ? await clienteAdmin().from("votos_prestamo").select("prestamo_id, comentario, voto").in("prestamo_id", lista.map((x) => x.id)).not("comentario", "is", null)
    : { data: [] };
  const notasDe = (id: string) => (comentarios ?? []).filter((c) => c.prestamo_id === id && c.comentario);
  // Del más antiguo al más nuevo (la lista viene del más nuevo al más antiguo).
  const enCurso = lista.filter((x) => ["radicado", "aprobado", "vigente"].includes(x.estado)).reverse();
  const hoy = hoyColombia();
  const tasas = { interes: p.interes_prestamo_pct ?? 4, mora: p.interes_mora_pct ?? 4 };
  const tope = p.tope_prestamo ?? 1_000_000;

  const idsEnCurso = enCurso.map((x) => x.id);
  const { data: todosMovs } = idsEnCurso.length
    ? await supabase.from("movimientos_prestamo").select("prestamo_id, tipo, monto, fecha").in("prestamo_id", idsEnCurso).order("fecha", { ascending: false })
    : { data: [] };
  const detalle = await Promise.all(
    enCurso.map(async (x) => {
      const movs = (todosMovs ?? []).filter((m) => m.prestamo_id === x.id);
      const cuentas = x.estado === "vigente" ? cuentasPrestamo(x.desembolsado_en, movs, hoy, tasas, x.cobrar_4x1000) : null;
      const posicion = x.estado !== "vigente" ? await supabase.rpc("posicion_cola", { p_prestamo: x.id }) : null;
      return { ...x, movs, cuentas, posicion: (posicion?.data as number | null | undefined) ?? null };
    }),
  );
  // Lo que ya debe o tiene solicitado cuenta contra el tope por persona.
  const comprometido = detalle.reduce((s, x) => s + (x.cuentas ? x.cuentas.saldoCapital : Number(x.monto)), 0);
  const cupo = Math.max(0, tope - comprometido);
  const puedePedir = Math.min(cupo, Math.max(0, Number(caja ?? 0)));
  const puedeSolicitar = cupo >= 10000;

  const cuenta = puedeSolicitar ? await estadoDeCuenta(perfil.id) : null;
  const bloqueoMultas = (cuenta?.multasPendientes ?? 0) > 0;
  const bloqueoMora = cuenta?.cuota?.estado === "En mora";

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-bold tracking-tight">Préstamos</h1>

      {puedeSolicitar && (bloqueoMultas || bloqueoMora) && cuenta && (
        <section className="space-y-3 rounded-[28px] border-2 border-danger bg-card p-5">
          <p className="flex items-center gap-2 font-bold text-danger">
            <Lock size={18} /> Solicitud bloqueada
          </p>
          {bloqueoMultas && (
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

      {puedeSolicitar && !bloqueoMultas && !bloqueoMora && (
        <>
          <p className="text-sm text-muted">
            {comprometido > 0
              ? `Entre tus préstamos y solicitudes ya tienes ${pesos(comprometido)} de un tope de ${pesos(tope)}: puedes pedir hasta ${pesos(cupo)} más.`
              : `Puedes pedir hasta ${pesos(tope)}.`}{" "}
            Hay {pesos(puedePedir)} disponibles para prestar ahora; si tu monto es mayor, tu solicitud espera sin bloquear a las demás: se desembolsa cuando haya caja y mientras tanto se atienden las menores que sí alcancen.
            Cada préstamo es independiente y paga su interés el mismo día del mes en que se desembolsa.
          </p>
          <SolicitudRapida caja={Math.max(0, Number(caja ?? 0))} tope={cupo} usado={comprometido} />
          <details className="rounded-[28px] bg-card p-4">
            <summary className="cursor-pointer text-sm font-semibold">Solicitar para un externo que apadrino</summary>
            <div className="pt-3">
              <FormularioSolicitud />
            </div>
          </details>
        </>
      )}

      {detalle.map((x, n) => (
        <section key={x.id} className="space-y-4">
          {detalle.length > 1 && <h2 className="px-1 text-lg font-semibold">Préstamo {n + 1}</h2>}
          {x.cuentas ? (
            <>
              <TarjetaPrestamo
                etiqueta="Tu préstamo"
                valor={pesos(x.cuentas.saldoCapital)}
                titular={perfil.nombre}
                izquierda={{ titulo: "Interés mensual", valor: pesos(x.cuentas.interesMensual) }}
                derecha={{ titulo: "Inicial", valor: pesos(x.cuentas.capitalInicial) }}
              />
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <Dato titulo="Interés pendiente" valor={pesos(x.cuentas.interesPendiente)} />
                <Dato titulo="Mora estimada" valor={pesos(x.cuentas.moraPendiente)} />
                <Dato titulo="Próximo pago" valor={x.cuentas.proximoPago ? fechaCorta(x.cuentas.proximoPago) : "—"} />
              </div>
              <Link
                href={`/pagos?pago=prestamo&id=${x.id}`}
                className="flex items-center justify-center rounded-full bg-accent py-4 font-semibold text-accent-fg"
              >
                Abonar o pagar interés
              </Link>
              <p className="text-xs text-muted">
                El interés de este préstamo vence cada mes, el mismo día en que se te habilitó, y se paga hasta cancelar todo el capital.{x.cuentas.primeraCuotaPendiente ? ` La primera cuota incluye el 4x1000 (${pesos(x.cuentas.cuatroPorMil)}), que solo se paga una vez.` : ""} Puedes abonar a capital cuando quieras y por
                cualquier valor. Lo que cancelas libera cupo para pedir más, dentro del tope. La mora es una estimación provisional.
              </p>
            </>
          ) : (
            <TarjetaPrestamo
              etiqueta={ETIQUETA[x.estado]}
              valor={pesos(Number(x.monto))}
              titular={perfil.nombre}
              izquierda={x.posicion != null ? { titulo: "Posición en la cola", valor: String(x.posicion) } : undefined}
            />
          )}
          {x.movs.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted">Movimientos</h3>
              {x.movs.map((m, i) => (
                <div key={i} className="flex justify-between rounded-2xl bg-card p-4 text-sm">
                  <div>
                    <p>{MOV[m.tipo] ?? m.tipo}</p>
                    <p className="text-xs text-muted">{fechaCorta(m.fecha)}</p>
                  </div>
                  <p className="font-semibold">{pesos(Number(m.monto))}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}

      {lista.filter((x) => !idsEnCurso.includes(x.id)).length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Historial</h2>
          {lista
            .filter((x) => !idsEnCurso.includes(x.id))
            .map((x) => (
              <div key={x.id} className="space-y-2 rounded-2xl bg-card p-4 text-sm">
                <div className="flex justify-between">
                  <div>
                    <p>{pesos(Number(x.monto))}</p>
                    <p className="text-xs text-muted">{fechaCorta(x.radicado_en.slice(0, 10))}</p>
                  </div>
                  <p className="text-muted">{ETIQUETA[x.estado]}</p>
                </div>
                {notasDe(x.id).map((c, i) => (
                  <p key={i} className="rounded-xl bg-background px-3 py-2 text-xs text-muted">
                    <span className="font-semibold text-foreground">Directivos:</span> {c.comentario}
                  </p>
                ))}
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
