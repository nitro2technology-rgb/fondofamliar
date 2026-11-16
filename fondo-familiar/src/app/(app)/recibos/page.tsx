import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requerirPerfil } from "@/lib/auth";
import { esSimulacionTurno, receptorDelMes, turnoPorConfirmar } from "@/lib/recibos";
import { mesLargo, pesos } from "@/lib/format";
import FilaRecibo from "./FilaRecibo";

export default function Recibos() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const perfil = await requerirPerfil();
  let turno = await turnoPorConfirmar(perfil.id);
  // Vista de ejemplo: un directivo sin turno ve la pantalla tal como la ve quien recibe este mes (solo lectura).
  let ejemploDe: string | null = esSimulacionTurno(perfil.id) && turno ? ((await receptorDelMes())?.nombre ?? "quien tiene el turno") : null;
  if (!turno && ["tesorero", "contador", "fiscal"].includes(perfil.rol)) {
    const receptor = await receptorDelMes();
    if (receptor) {
      turno = await turnoPorConfirmar(receptor.id);
      ejemploDe = turno ? receptor.nombre : null;
    }
  }
  // Solo se muestra durante el mes de tu turno (o mientras queden pagos sin confirmar).
  if (!turno) redirect("/");

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-accent underline">
        ← Inicio
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Confirmar pagos</h1>
      {ejemploDe && (
        <p className="rounded-2xl bg-amber/15 px-4 py-3 text-sm text-amber">
          Vista de ejemplo: así la ve {ejemploDe}, quien tiene el turno este mes. Aquí solo puedes mirar; los pagos se aprueban en Admin → Pagos.
        </p>
      )}
      <p className="text-sm text-muted">
        Es tu turno de cadena ({mesLargo(turno.periodo)}). Aquí ves los comprobantes de este mes para llevar el control; confirma si recibiste el dinero.
      </p>

      <div className="rounded-2xl bg-gradient-to-br from-[#0b7a57] to-[#0e3b2e] p-4 text-white">
        <p className="text-3xl font-bold">
          {turno.confirmados} de {turno.total}
        </p>
        <p className="text-sm opacity-80">
          pagos confirmados · {turno.porConfirmar} por confirmar · {turno.sinSubir} sin comprobante
        </p>
      </div>

      <div className="space-y-2">
        {turno.filas.map((f) => (
          <FilaRecibo
            key={f.cuotaId}
            reporteId={f.reporteId}
            nombre={f.nombre}
            monto={pesos(f.monto)}
            estadoInicial={f.estado}
            url={f.url}
            confirmadoPorMi={f.confirmadoPorMi}
            soloLectura={!!ejemploDe}
          />
        ))}
      </div>
    </div>
  );
}
