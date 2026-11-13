"use client";

import { useState, useTransition } from "react";
import { guardarNotaPrestamo } from "@/lib/acciones";

// Nota interna del préstamo (solo la ven los directivos): para dejar constancia de lo que ocurra con él.
export default function NotaPrestamo({ id, inicial }: { id: string; inicial: string | null }) {
  const [nota, setNota] = useState(inicial ?? "");
  const [guardada, setGuardada] = useState(inicial ?? "");
  const [abierto, setAbierto] = useState(false);
  const [enviando, iniciar] = useTransition();

  function guardar() {
    iniciar(async () => {
      await guardarNotaPrestamo(id, nota);
      setGuardada(nota.trim());
      setAbierto(false);
    });
  }

  if (!abierto) {
    return (
      <div className="space-y-1.5">
        {guardada && (
          <p className="rounded-2xl bg-background px-3 py-2 text-xs">
            <span className="font-semibold">Nota: </span>
            {guardada}
          </p>
        )}
        <button type="button" onClick={() => setAbierto(true)} className="text-xs font-semibold text-accent">
          {guardada ? "Editar nota" : "Agregar nota"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="Describe lo que ocurrió con este préstamo (solo la ven los directivos)"
        className="w-full rounded-2xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex gap-2">
        <button type="button" disabled={enviando} onClick={guardar} className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-fg disabled:opacity-60">
          {enviando ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="rounded-full bg-background px-4 py-2 text-xs font-semibold text-muted">
          Cancelar
        </button>
      </div>
    </div>
  );
}
