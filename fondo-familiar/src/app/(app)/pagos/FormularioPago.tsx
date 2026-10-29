"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { reportarPago, type EstadoForm } from "@/lib/acciones";
import { datosConImagenComprimida, errorDeArchivo } from "@/lib/comprimir";
import VisorImagen from "@/components/VisorImagen";

const campo =
  "w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

const ETIQUETA = {
  pendiente: ["En revisión", "bg-card-border text-muted"],
  aprobado: ["Aprobado", "bg-accent-soft text-accent"],
  rechazado: ["Rechazado", "text-danger"],
} as const;

export default function FormularioPago({
  cuotaId,
  tipo,
  titulo,
  detalle,
  monto,
  reporte,
}: {
  cuotaId: string;
  tipo: "fondo" | "cadena";
  titulo: string;
  detalle: string;
  monto: string;
  reporte: { estado: "pendiente" | "aprobado" | "rechazado"; nota: string | null; url: string | null } | null;
}) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(reportarPago, {});
  const [comprimiendo, setComprimiendo] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const ocupado = pendiente || comprimiendo;

  async function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ocupado) return;
    const form = e.currentTarget;
    setComprimiendo(true);
    const datos = await datosConImagenComprimida(form);
    setComprimiendo(false);
    const problema = errorDeArchivo(datos);
    setErrorLocal(problema ?? "");
    if (problema) return;
    startTransition(() => accion(datos));
  }

  const [textoEstado, claseEstado] = reporte ? ETIQUETA[reporte.estado] : ["Sin enviar", "bg-card-border text-muted"];
  const aprobado = reporte?.estado === "aprobado";

  return (
    <div className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{titulo}</h2>
          <p className="text-xs text-muted">{detalle}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">{monto}</p>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${claseEstado}`}>{textoEstado}</span>
        </div>
      </div>

      {reporte?.estado === "rechazado" && (
        <p className="text-sm text-danger">Rechazado{reporte.nota ? `: ${reporte.nota}` : ""}. Envía el comprobante de nuevo.</p>
      )}
      {reporte?.url && <VisorImagen url={reporte.url} texto="Ver mi comprobante" />}

      {!aprobado && (
        <form onSubmit={alEnviar} className="space-y-3">
          <input type="hidden" name="cuota_id" value={cuotaId} />
          <input type="hidden" name="tipo" value={tipo} />
          <input type="file" name="archivo" accept="image/*" className={campo} />
          <div className="flex items-center gap-3">
            <button disabled={ocupado} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60">
              {comprimiendo ? "Comprimiendo…" : pendiente ? "Enviando…" : reporte ? "Reemplazar comprobante" : "Enviar comprobante"}
            </button>
            {estado.ok && !ocupado && <span className="text-sm text-ok">Enviado</span>}
          </div>
          {(errorLocal || estado.error) && !ocupado && <p className="text-sm text-danger">{errorLocal || estado.error}</p>}
          <p className="text-xs text-muted">¿No logras subirlo? Envíaselo a un administrador y él lo carga por ti.</p>
        </form>
      )}
    </div>
  );
}
