"use client";

import { useState, useTransition } from "react";
import { revisarPagoPrestamo } from "@/lib/acciones";
import VisorImagen from "@/components/VisorImagen";

type Estado = "pendiente" | "aprobado" | "rechazado";

const ETIQUETA: Record<Estado, [string, string]> = {
  pendiente: ["Por revisar", "bg-card-border text-muted"],
  aprobado: ["Aprobado", "bg-accent-soft text-accent"],
  rechazado: ["Rechazado", "bg-danger/15 text-danger"],
};

// Pago de préstamo reportado. Al aprobar se aplica al préstamo y ya no se puede deshacer
// (los movimientos son de solo inserción), por eso pide confirmación.
export default function RevisionPagoPrestamo({
  id,
  asociado,
  detalle,
  total,
  fecha,
  estadoInicial,
  notaInicial,
  url,
}: {
  id: string;
  asociado: string;
  detalle: string;
  total: string;
  fecha: string;
  estadoInicial: Estado;
  notaInicial: string | null;
  url: string | null;
}) {
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [nota, setNota] = useState(notaInicial);
  const [confirmando, setConfirmando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();

  function decidir(decision: "aprobado" | "rechazado") {
    if (enviando) return;
    setError("");
    setConfirmando(false);
    setRechazando(false);
    iniciar(async () => {
      const r = await revisarPagoPrestamo(id, decision, motivo.trim());
      if (r.error) {
        setError(r.error);
        return;
      }
      setEstado(decision);
      setNota(decision === "rechazado" ? motivo.trim() || null : null);
    });
  }

  const [textoEstado, clase] = ETIQUETA[estado];
  const boton = "rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60";

  return (
    <div className="space-y-2 rounded-2xl bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium">{asociado}</p>
          <p className="text-xs text-muted">
            {fecha} · {detalle}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{total}</p>
          <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${clase}`}>{textoEstado}</span>
        </div>
      </div>
      {estado === "rechazado" && nota && <p className="text-xs text-danger">Motivo: {nota}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {url && <VisorImagen url={url} texto="Ver captura" />}
        {estado === "pendiente" && !confirmando && !rechazando && (
          <>
            <button type="button" disabled={enviando} onClick={() => setConfirmando(true)} className={`${boton} bg-accent text-accent-fg`}>
              Aprobar
            </button>
            <button type="button" disabled={enviando} onClick={() => setRechazando(true)} className={`${boton} border border-card-border text-danger`}>
              Rechazar
            </button>
          </>
        )}
      </div>

      {confirmando && (
        <div className="space-y-2 rounded-xl bg-background p-3 text-xs">
          <p>Se registrará en el préstamo ({detalle}). Esto no se puede deshacer.</p>
          <div className="flex gap-2">
            <button type="button" disabled={enviando} onClick={() => decidir("aprobado")} className={`${boton} bg-accent text-accent-fg`}>
              Sí, aprobar
            </button>
            <button type="button" onClick={() => setConfirmando(false)} className={`${boton} border border-card-border`}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {rechazando && (
        <div className="flex gap-2">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional)"
            className="min-w-0 flex-1 rounded-xl border border-card-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button type="button" disabled={enviando} onClick={() => decidir("rechazado")} className={`${boton} bg-danger text-white`}>
            Confirmar
          </button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
