"use client";

import { useState, type ReactNode } from "react";

type Panel = "fondo" | "cadena" | "verificar";

// Tres acciones rápidas por asociado que debe: subir comprobante de fondo, de cadena o verificar/aprobar lo enviado.
// Los paneles llegan ya armados desde el servidor.
export default function AccionesCuota({
  subirFondo,
  subirCadena,
  verificar,
  puedeFondo,
  puedeCadena,
  porRevisar,
  hayEnviados,
}: {
  subirFondo: ReactNode;
  subirCadena: ReactNode | null;
  verificar: ReactNode;
  puedeFondo: boolean;
  puedeCadena: boolean;
  porRevisar: number;
  hayEnviados: boolean;
}) {
  const [panel, setPanel] = useState<Panel | null>(porRevisar > 0 ? "verificar" : null);
  const alternar = (p: Panel) => setPanel((a) => (a === p ? null : p));
  const base = "rounded-full px-3 py-2 text-xs font-semibold disabled:opacity-40";
  const estilo = (p: Panel) => `${base} ${panel === p ? "bg-foreground text-background" : "bg-background text-foreground"}`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!puedeFondo} onClick={() => alternar("fondo")} className={estilo("fondo")}>
          Subir comprobante fondo
        </button>
        {subirCadena !== null && (
          <button type="button" disabled={!puedeCadena} onClick={() => alternar("cadena")} className={estilo("cadena")}>
            Subir comprobante de cadena
          </button>
        )}
        <button type="button" disabled={!hayEnviados} onClick={() => alternar("verificar")} className={estilo("verificar")}>
          Verificar pago{porRevisar > 0 ? ` (${porRevisar})` : ""}
        </button>
      </div>
      {panel === "fondo" && subirFondo}
      {panel === "cadena" && subirCadena}
      {panel === "verificar" && <div className="space-y-2 rounded-2xl bg-background p-3">{verificar}</div>}
    </div>
  );
}
