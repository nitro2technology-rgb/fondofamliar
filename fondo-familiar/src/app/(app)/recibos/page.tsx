import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requerirPerfil } from "@/lib/auth";
import { turnoPorConfirmar } from "@/lib/recibos";
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
  const turno = await turnoPorConfirmar(perfil.id);
  // Sin turno activo, o con todos los pagos ya confirmados, la ventana no se muestra.
  if (!turno) redirect("/");

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-accent underline">
        ← Inicio
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Confirmar pagos</h1>
      <p className="text-sm text-muted">
        Es tu turno de cadena ({mesLargo(turno.periodo)}). Revisa la captura de cada socio y confirma si recibiste el dinero.
      </p>

      <div className="rounded-2xl bg-gradient-to-br from-accent to-[#4a1d99] p-4 text-accent-fg">
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
          />
        ))}
      </div>
    </div>
  );
}
