"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import Avatar from "@/components/Avatar";
import { guardarAsistencia } from "@/lib/acciones";

const ESTADOS = [
  ["puntual", "Puntual", "bg-accent text-accent-fg"],
  ["tarde", "Tarde", "bg-amber text-accent-fg"],
  ["ausente", "Ausente", "bg-danger text-white"],
  ["justificada", "Excusa", "bg-accent text-accent-fg"],
] as const;

type Persona = { id: string; nombre: string; ciudad: string | null };

// Todos arrancan como "puntual": el admin solo cambia a quien llegó tarde, faltó o se excusó.
// Cada cambio muestra la multa que generará; al guardar, las multas quedan listas para cobrar en «Multas».
export default function FormularioAsistencia({
  reunionId,
  personas,
  fotos,
  guardados,
  multaTarde,
  multaAusencia,
}: {
  reunionId: string;
  personas: Persona[];
  fotos: Record<string, string>;
  guardados: Record<string, string>;
  multaTarde: number;
  multaAusencia: number;
}) {
  const inicial = Object.fromEntries(personas.map((p) => [p.id, guardados[p.id] ?? "puntual"]));
  const [estados, setEstados] = useState<Record<string, string>>(inicial);
  const [base, setBase] = useState<Record<string, string> | null>(Object.keys(guardados).length ? inicial : null);
  const [error, setError] = useState("");
  const [guardadoAhora, setGuardadoAhora] = useState(false);
  const [guardando, iniciar] = useTransition();

  const sinCambios = base !== null && personas.every((p) => estados[p.id] === base[p.id]);
  const multaDe = (p: Persona) =>
    estados[p.id] === "tarde" ? multaTarde : estados[p.id] === "ausente" && p.ciudad === "Pasto" ? multaAusencia : 0;
  const total = personas.reduce((s, p) => s + multaDe(p), 0);
  const conMulta = personas.filter((p) => multaDe(p) > 0).length;
  const pesos = (n: number) => `$${n.toLocaleString("es-CO")}`;

  function guardar() {
    if (guardando) return;
    const anterior = base;
    setError("");
    setGuardadoAhora(false);
    setBase(estados);
    iniciar(async () => {
      const r = await guardarAsistencia(reunionId, estados);
      if (r.error) {
        setBase(anterior);
        setError(r.error);
      } else {
        setGuardadoAhora(true);
      }
    });
  }

  return (
    <div className="space-y-3">
      {personas.map((p) => {
        const multa = multaDe(p);
        return (
          <div key={p.id} className="space-y-3 rounded-[28px] bg-card p-4">
            <div className="flex items-center gap-3">
              <Avatar nombre={p.nombre} size={36} foto={fotos[p.id]} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold leading-tight">{p.nombre}</p>
                {p.ciudad && <p className="text-xs text-muted">{p.ciudad}</p>}
              </div>
              {multa > 0 && (
                <span className="rounded-full bg-amber/15 px-2.5 py-1 text-xs font-semibold text-amber">
                  Multa {pesos(multa)}
                </span>
              )}
              {estados[p.id] === "ausente" && multa === 0 && (
                <span className="rounded-full bg-card-border px-2.5 py-1 text-xs text-muted">Sin multa</span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-1 rounded-full bg-background p-1">
              {ESTADOS.map(([valor, texto, activa]) => (
                <button
                  key={valor}
                  type="button"
                  disabled={guardando}
                  onClick={() => setEstados((e) => ({ ...e, [p.id]: valor }))}
                  className={`rounded-full py-2 text-xs font-semibold transition-colors disabled:opacity-60 ${
                    estados[p.id] === valor ? activa : "text-muted"
                  }`}
                >
                  {texto}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div className="rounded-[28px] bg-accent-soft p-4 text-sm">
        <p className="font-semibold text-accent">
          {conMulta === 0 ? "Sin multas en esta reunión" : `${conMulta} multa${conMulta > 1 ? "s" : ""} · ${pesos(total)} por cobrar`}
        </p>
        <p className="text-xs text-muted">
          Tarde {pesos(multaTarde)} · Ausente {pesos(multaAusencia)} (solo si vive en Pasto). Se cobran en la sección Multas.
        </p>
      </div>

      <button
        type="button"
        onClick={guardar}
        disabled={guardando || sinCambios}
        className="w-full rounded-full bg-accent py-4 font-semibold text-accent-fg disabled:opacity-60"
      >
        {guardando ? "Guardando…" : sinCambios ? "Asistencia guardada ✓" : "Guardar asistencia"}
      </button>
      {guardadoAhora && conMulta > 0 && (
        <Link href="/admin/multas" className="flex items-center justify-center gap-2 text-sm text-accent underline">
          <CheckCircle2 size={16} /> Multas generadas: ir a cobrarlas
        </Link>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
