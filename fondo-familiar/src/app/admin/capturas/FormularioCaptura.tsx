"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { subirCaptura, type EstadoForm } from "@/lib/acciones";
import { datosConImagenComprimida, errorDeArchivo } from "@/lib/comprimir";

const campo =
  "w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default function FormularioCaptura({ mesActual }: { mesActual: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(subirCaptura, {});
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

  return (
    <form onSubmit={alEnviar} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Mes</span>
        <input type="month" name="mes" defaultValue={mesActual} className={campo} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Saldo que muestra la cuenta (opcional)</span>
        <input name="saldo" inputMode="numeric" placeholder="Ej: 1500000" className={campo} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Captura de pantalla (se comprime sola)</span>
        <input type="file" name="archivo" accept="image/*" className={campo} />
      </label>
      <p className="text-xs text-muted">Si ya hay una captura de ese mes, esta la reemplaza.</p>
      <div className="flex items-center gap-3">
        <button disabled={ocupado} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60">
          {comprimiendo ? "Comprimiendo…" : pendiente ? "Subiendo…" : "Subir captura"}
        </button>
        {estado.ok && !ocupado && <span className="text-sm text-ok">Guardada</span>}
        {(errorLocal || estado.error) && !ocupado && <span className="text-sm text-danger">{errorLocal || estado.error}</span>}
      </div>
    </form>
  );
}
