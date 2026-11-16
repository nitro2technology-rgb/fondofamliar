"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { eliminarPremioBingo, registrarPremioBingo, type EstadoForm } from "@/lib/acciones";
import { datosConImagenComprimida, errorDeArchivo } from "@/lib/comprimir";
import SelectorArchivo from "@/components/SelectorArchivo";
import VisorImagen from "@/components/VisorImagen";
import { pesos } from "@/lib/format";

type Persona = { id: string; nombre: string };
export type PremioBingo = { id: string; ganador: string; monto: number; url: string | null };

function FormularioPremio({ reunionId, personas, premioDefecto, numero }: { reunionId: string; personas: Persona[]; premioDefecto: number; numero: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(registrarPremioBingo, {});
  const [comprimiendo, setComprimiendo] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const ocupado = pendiente || comprimiendo;
  const campo = "w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent";

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

  return (
    <form onSubmit={alEnviar} className="space-y-3 rounded-2xl bg-background p-4">
      <p className="text-sm font-semibold">Registrar premio del bingo {numero}</p>
      <input type="hidden" name="reunion_id" value={reunionId} />
      <label className="block space-y-1">
        <span className="text-xs text-muted">Ganador</span>
        <select name="ganador_id" required defaultValue="" className={campo}>
          <option value="" disabled>
            Elegir…
          </option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-xs text-muted">Premio pagado</span>
        <input name="monto" required inputMode="numeric" defaultValue={premioDefecto} className={campo} />
      </label>
      <SelectorArchivo titulo="Subir comprobante del pago" ayuda="Pantallazo de la transferencia al ganador" />
      <button disabled={ocupado} className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-fg disabled:opacity-60">
        {comprimiendo ? "Comprimiendo…" : pendiente ? "Registrando…" : "Registrar premio"}
      </button>
      {(errorLocal || estado.error) && !ocupado && <p className="text-xs text-danger">{errorLocal || estado.error}</p>}
    </form>
  );
}

function FilaPremio({ p }: { p: PremioBingo }) {
  const [borrando, setBorrando] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-background px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{p.ganador}</p>
        <p className="text-xs text-muted">{pesos(p.monto)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {p.url && <VisorImagen url={p.url} texto="Ver comprobante" />}
        <button
          type="button"
          disabled={borrando}
          onClick={() => {
            if (!window.confirm(`¿Quitar el premio de ${p.ganador}?`)) return;
            setBorrando(true);
            startTransition(async () => {
              await eliminarPremioBingo(p.id);
              setBorrando(false);
            });
          }}
          className="text-xs text-danger disabled:opacity-50"
        >
          Quitar
        </button>
      </div>
    </div>
  );
}

// Premios de los bingos de una reunión: se registra cada ganador con el comprobante de lo que se le pagó.
export default function BingosReunion({
  reunionId,
  personas,
  premios,
  maximo,
  premioDefecto,
}: {
  reunionId: string;
  personas: Persona[];
  premios: PremioBingo[];
  maximo: number;
  premioDefecto: number;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Bingos de esta reunión: {premios.length} de {maximo} con premio registrado.
      </p>
      {premios.map((p) => (
        <FilaPremio key={p.id} p={p} />
      ))}
      {premios.length < maximo && (
        <FormularioPremio key={premios.length} reunionId={reunionId} personas={personas} premioDefecto={premioDefecto} numero={premios.length + 1} />
      )}
    </div>
  );
}
