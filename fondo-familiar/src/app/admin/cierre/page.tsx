import { Suspense } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, FileText, TriangleAlert } from "lucide-react";
import { requerirAdmin } from "@/lib/auth";
import { datosCierre } from "@/lib/cierre";
import { fechaCorta, pesos } from "@/lib/format";

export default function Cierre() {
  return (
    <Suspense fallback={<main className="flex-1 px-4 pt-6 text-muted">Cargando…</main>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await requerirAdmin();
  const c = await datosCierre();
  const listo = c.pendientes.length === 0;
  const vencido = c.vencido;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-6 px-4 py-6">
      <Link href="/admin/mas" className="text-sm text-accent underline">
        ← Más
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Cierre de ciclo</h1>

      {/* Estado */}
      <section
        className={`rounded-[28px] border-2 p-5 ${listo ? "border-ok bg-card" : vencido ? "border-danger bg-card" : "border-accent bg-accent-soft"}`}
      >
        <div className="flex items-center gap-3">
          {listo ? <CheckCircle2 className="text-ok" /> : vencido ? <TriangleAlert className="text-danger" /> : <Clock className="text-accent" />}
          <p className="font-bold">
            {listo
              ? "Sin deudas: se puede liquidar"
              : vencido
                ? "Plazo vencido con préstamos sin pagar"
                : `${c.pendientes.length} préstamo${c.pendientes.length > 1 ? "s" : ""} por cancelar`}
          </p>
        </div>
        {c.ultima && c.plazo && (
          <p className="mt-3 text-sm text-muted">
            Reunión de liquidación: <span className="font-semibold text-foreground">{fechaCorta(c.ultima)}</span> a las{" "}
            {c.plazo.horaReunion}. Los préstamos deben quedar pagos (capital, interés y mora){" "}
            <span className="font-semibold text-foreground">hasta las {c.plazo.horaLimite}</span> de ese día.
          </p>
        )}
      </section>

      {!listo && (
        <section className="space-y-2">
          <h2 className="px-1 text-lg font-semibold">Falta por cancelar · {pesos(c.deudaTotal)}</h2>
          <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-2">
            {c.pendientes.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-2 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.nombre}</p>
                  <p className="text-xs text-muted">
                    Capital {pesos(p.cuentas.saldoCapital)} · Interés {pesos(p.cuentas.interesPendiente)}
                    {p.cuentas.moraPendiente > 0 && ` · Mora ${pesos(p.cuentas.moraPendiente)}`}
                  </p>
                </div>
                <p className="font-semibold">
                  {pesos(p.cuentas.saldoCapital + p.cuentas.interesPendiente + p.cuentas.moraPendiente)}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Utilidades */}
      <section className="space-y-2">
        <h2 className="px-1 text-lg font-semibold">Utilidades a repartir</h2>
        <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-4">
          <Linea t="Intereses cobrados" v={pesos(c.utilidades.intereses)} />
          <Linea t="Mora cobrada" v={pesos(c.utilidades.mora)} />
          <Linea t="Multas pagadas" v={pesos(c.utilidades.multas)} />
          <Linea t="Utilidad de juegos" v={pesos(c.utilidades.juegos)} />
          <Linea t="Total" v={pesos(c.totalUtilidades)} fuerte />
          <Linea t={`Parte de cada uno (÷ ${c.filas.length})`} v={pesos(c.parte)} fuerte />
        </div>
      </section>

      {/* Liquidación */}
      <section className="space-y-2">
        <h2 className="px-1 text-lg font-semibold">Liquidación por asociado</h2>
        <p className="px-1 text-xs text-muted">
          Corte a hoy: con lo registrado hasta ahora. Las cifras se actualizan hasta la reunión.
        </p>
        <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-2">
          {c.filas.map((f) => (
            <div key={f.id} className="flex items-center gap-3 px-2 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{f.nombre}</p>
                <p className="text-xs text-muted">
                  Ahorro {pesos(f.ahorro)} + utilidad {pesos(f.utilidad)}
                </p>
              </div>
              <p className="font-semibold">{pesos(f.total)}</p>
            </div>
          ))}
          <div className="flex items-center justify-between px-2 py-4 font-bold">
            <span>Total a devolver</span>
            <span>{pesos(c.totalLiquidar)}</span>
          </div>
        </div>
      </section>

      <a
        href="/admin/liquidacion-pdf"
        className="flex items-center justify-center gap-2 rounded-full bg-foreground py-4 font-semibold text-background"
      >
        <FileText size={20} />
        Descargar liquidación (PDF)
      </a>
    </main>
  );
}

function Linea({ t, v, fuerte }: { t: string; v: string; fuerte?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3 ${fuerte ? "font-bold" : "text-sm"}`}>
      <span className={fuerte ? "" : "text-muted"}>{t}</span>
      <span>{v}</span>
    </div>
  );
}
