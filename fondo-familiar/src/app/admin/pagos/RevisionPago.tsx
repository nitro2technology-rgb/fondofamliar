"use client";

import { useState, useTransition } from "react";
import { revisarPago } from "@/lib/acciones";
import VisorImagen from "@/components/VisorImagen";

type Estado = "pendiente" | "aprobado" | "rechazado";

const ETIQUETA: Record<Estado, [string, string]> = {
  pendiente: ["Por revisar", "bg-card-border text-muted"],
  aprobado: ["Aprobado", "bg-accent-soft text-accent"],
  rechazado: ["Rechazado", "text-danger"],
};

// Una línea de pago (fondo o cadena). El estado cambia en pantalla al instante y se confirma en segundo plano.
export default function RevisionPago({
  id,
  titulo,
  monto,
  estadoInicial,
  notaInicial,
  confirmadoPor,
  cargadoPor,
  url,
}: {
  id: string;
  titulo: string;
  monto: string;
  estadoInicial: Estado;
  notaInicial: string | null;
  confirmadoPor: string | null;
  cargadoPor: string | null;
  url: string | null;
}) {
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [nota, setNota] = useState(notaInicial);
  const [motivo, setMotivo] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const [error, setError] = useState("");
  const [enviando, iniciar] = useTransition();

  function decidir(decision: Estado, texto?: string) {
    if (enviando) return;
    const anterior = { estado, nota };
    setError("");
    setEstado(decision);
    setNota(decision === "rechazado" ? texto || null : null);
    setRechazando(false);
    iniciar(async () => {
      const r = await revisarPago(id, decision, texto);
      if (r.error) {
        setEstado(anterior.estado);
        setNota(anterior.nota);
        setError(r.error);
      }
    });
  }

  const [textoEstado, clase] = ETIQUETA[estado];
  const boton = "rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-60";

  return (
    <div className="space-y-2 border-t border-card-border pt-2 first:border-t-0 first:pt-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm">
          {titulo} · <span className="font-medium">{monto}</span>
        </p>
        <span className={`rounded-full px-2 py-0.5 text-xs ${clase}`}>{textoEstado}</span>
      </div>
      {cargadoPor && <p className="text-xs text-muted">Comprobante cargado por {cargadoPor}</p>}
      {estado === "aprobado" && confirmadoPor && <p className="text-xs text-muted">Confirmado por {confirmadoPor}</p>}
      {estado === "rechazado" && nota && <p className="text-xs text-danger">Motivo: {nota}</p>}

      <div className="flex flex-wrap items-center gap-2">
        {url && <VisorImagen url={url} texto="Ver captura" />}
        {estado !== "aprobado" && (
          <button type="button" disabled={enviando} onClick={() => decidir("aprobado")} className={`${boton} bg-accent text-accent-fg`}>
            Aprobar
          </button>
        )}
        {estado === "pendiente" && !rechazando && (
          <button type="button" disabled={enviando} onClick={() => setRechazando(true)} className={`${boton} border border-card-border text-danger`}>
            Rechazar
          </button>
        )}
        {estado !== "pendiente" && (
          <button type="button" disabled={enviando} onClick={() => decidir("pendiente")} className={`${boton} border border-card-border text-muted`}>
            Deshacer
          </button>
        )}
      </div>

      {rechazando && (
        <div className="flex gap-2">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional)"
            className="min-w-0 flex-1 rounded-xl border border-card-border bg-background px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <button type="button" disabled={enviando} onClick={() => decidir("rechazado", motivo.trim())} className={`${boton} bg-danger text-white`}>
            Confirmar
          </button>
        </div>
      )}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
