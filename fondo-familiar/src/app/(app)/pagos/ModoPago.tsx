"use client";

import { useState, type ReactNode } from "react";
import PagoPorVarios, { type OpcionPersona } from "./PagoPorVarios";

// Elige entre registrar el pago solo propio o junto con otras personas.
export default function ModoPago({ personas, yoId, children }: { personas: OpcionPersona[]; yoId: string; children: ReactNode }) {
  const [modo, setModo] = useState<"solo" | "varios">("solo");
  const pildora = (activo: boolean) =>
    `flex-1 rounded-full px-3 py-2.5 text-center text-xs font-semibold leading-tight ${activo ? "bg-accent text-accent-fg" : "text-muted"}`;

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-full bg-card p-1">
        <button type="button" onClick={() => setModo("solo")} className={pildora(modo === "solo")}>
          Registrar pago solo para mí
        </button>
        <button type="button" onClick={() => setModo("varios")} className={pildora(modo === "varios")}>
          Registrar pago para mí y más usuarios
        </button>
      </div>
      {modo === "solo" ? children : <PagoPorVarios personas={personas} yoId={yoId} />}
    </div>
  );
}
