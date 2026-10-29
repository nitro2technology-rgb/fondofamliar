"use client";

import { useState, useTransition } from "react";
import { guardarAsistencia } from "@/lib/acciones";

const ESTADOS = [
  ["puntual", "Puntual"],
  ["tarde", "Tarde"],
  ["ausente", "Ausente"],
  ["justificada", "Excusa"],
] as const;

type Persona = { id: string; nombre: string; ciudad: string | null };

// Todos arrancan como "puntual": el admin solo cambia a quien llegó tarde, faltó o se excusó.
export default function FormularioAsistencia({
  reunionId,
  personas,
  guardados,
}: {
  reunionId: string;
  personas: Persona[];
  guardados: Record<string, string>;
}) {
  const inicial = Object.fromEntries(personas.map((p) => [p.id, guardados[p.id] ?? "puntual"]));
  const [estados, setEstados] = useState<Record<string, string>>(inicial);
  const [base, setBase] = useState<Record<string, string> | null>(Object.keys(guardados).length ? inicial : null);
  const [error, setError] = useState("");
  const [guardando, iniciar] = useTransition();

  const sinCambios = base !== null && personas.every((p) => estados[p.id] === base[p.id]);
  const tardes = personas.filter((p) => estados[p.id] === "tarde").length;
  const ausentes = personas.filter((p) => estados[p.id] === "ausente").length;

  function guardar() {
    if (guardando) return;
    const anterior = base;
    setError("");
    // El cambio se da por guardado de inmediato; si el servidor falla, se revierte y se avisa.
    setBase(estados);
    iniciar(async () => {
      const r = await guardarAsistencia(reunionId, estados);
      if (r.error) {
        setBase(anterior);
        setError(r.error);
      }
    });
  }

  return (
    <div className="space-y-2">
      {personas.map((p) => (
        <div key={p.id} className="space-y-2 rounded-2xl border border-card-border bg-card p-3">
          <div className="flex items-baseline justify-between">
            <p className="text-sm font-medium">{p.nombre}</p>
            {p.ciudad && <p className="text-xs text-muted">{p.ciudad}</p>}
          </div>
          <div className="grid grid-cols-4 gap-1">
            {ESTADOS.map(([valor, texto]) => {
              const activo = estados[p.id] === valor;
              const alerta = valor === "tarde" || valor === "ausente";
              return (
                <button
                  key={valor}
                  type="button"
                  disabled={guardando}
                  onClick={() => setEstados((e) => ({ ...e, [p.id]: valor }))}
                  className={`rounded-lg py-1.5 text-xs font-medium disabled:opacity-60 ${
                    activo
                      ? alerta
                        ? "bg-danger text-white"
                        : "bg-accent text-accent-fg"
                      : "border border-card-border text-muted"
                  }`}
                >
                  {texto}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <p className="text-xs text-muted">
        {tardes} tarde · {ausentes} ausente{ausentes === 1 ? "" : "s"}
      </p>
      <button
        type="button"
        onClick={guardar}
        disabled={guardando || sinCambios}
        className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-fg disabled:opacity-60"
      >
        {guardando ? "Guardando…" : sinCambios ? "Asistencia guardada ✓" : "Guardar asistencia"}
      </button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
