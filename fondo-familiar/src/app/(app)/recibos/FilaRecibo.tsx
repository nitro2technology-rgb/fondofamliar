"use client";

import { useState, useTransition } from "react";
import { confirmarRecepcion } from "@/lib/acciones";
import VisorImagen from "@/components/VisorImagen";
import type { EstadoRecibo } from "@/lib/recibos";

const ETIQUETA: Record<EstadoRecibo, [string, string]> = {
  confirmado: ["Confirmado", "bg-accent-soft text-accent"],
  por_confirmar: ["Por confirmar", "bg-card-border text-muted"],
  rechazado: ["No recibido", "text-danger"],
  sin_subir: ["Sin comprobante", "text-danger"],
};

// El estado cambia en pantalla al instante; si el servidor falla, se revierte y se avisa.
export default function FilaRecibo({
  reporteId,
  nombre,
  monto,
  estadoInicial,
  url,
  confirmadoPorMi,
}: {
  reporteId: string | null;
  nombre: string;
  monto: string;
  estadoInicial: EstadoRecibo;
  url: string | null;
  confirmadoPorMi: boolean;
}) {
  const [estado, setEstado] = useState(estadoInicial);
  const [mio, setMio] = useState(confirmadoPorMi);
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();

  function decidir(decision: "recibido" | "no_recibido" | "deshacer") {
    if (enviando || !reporteId) return;
    const anterior = { estado, mio };
    setError("");
    setEstado(decision === "recibido" ? "confirmado" : decision === "no_recibido" ? "rechazado" : "por_confirmar");
    setMio(decision === "recibido");
    iniciar(async () => {
      const r = await confirmarRecepcion(reporteId, decision);
      if (r.error) {
        setEstado(anterior.estado);
        setMio(anterior.mio);
        setError(r.error);
      }
    });
  }

  const [texto, clase] = ETIQUETA[estado];
  const boton = "rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60";

  return (
    <div className="space-y-2 rounded-2xl border border-card-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{nombre}</p>
          <p className="text-xs text-muted">{monto}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs ${clase}`}>{texto}</span>
      </div>

      {reporteId && (
        <div className="flex flex-wrap items-center gap-2">
          {url && <VisorImagen url={url} texto="Ver captura" />}
          {estado !== "confirmado" && (
            <button type="button" disabled={enviando} onClick={() => decidir("recibido")} className={`${boton} bg-accent text-accent-fg`}>
              Recibí
            </button>
          )}
          {estado === "por_confirmar" && (
            <button type="button" disabled={enviando} onClick={() => decidir("no_recibido")} className={`${boton} border border-card-border text-danger`}>
              No lo recibí
            </button>
          )}
          {estado === "confirmado" && mio && (
            <button type="button" disabled={enviando} onClick={() => decidir("deshacer")} className={`${boton} border border-card-border text-muted`}>
              Deshacer
            </button>
          )}
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
