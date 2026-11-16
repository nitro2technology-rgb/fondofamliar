"use client";

import { useActionState, useState } from "react";
import { registrarPrestamoManual, type EstadoForm } from "@/lib/acciones";

type Persona = { id: string; nombre: string };

// Registro de un préstamo entregado sin pasar por la app (queda vigente desde la fecha del desembolso).
export default function PrestamoManual({ personas, hoy }: { personas: Persona[]; hoy: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(registrarPrestamoManual, {});

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="w-full rounded-full border border-card-border bg-card py-3.5 text-sm font-semibold">
        Registrar préstamo manual
      </button>
    );
  }

  const campo = "w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent";

  return (
    <form action={accion} className="space-y-3 rounded-[28px] bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Registrar préstamo manual</p>
        <button type="button" onClick={() => setAbierto(false)} className="text-xs text-muted">
          Cerrar
        </button>
      </div>
      <p className="text-xs text-muted">
        Para préstamos que se entregaron sin solicitarlos en la app. Queda vigente desde la fecha del desembolso, sin pasar por la votación.
      </p>

      <label className="block space-y-1">
        <span className="text-xs text-muted">Asociado</span>
        <select name="asociado_id" required defaultValue="" className={campo}>
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
        <span className="text-xs text-muted">Monto prestado</span>
        <input name="monto" required inputMode="numeric" placeholder="Ej: 500000" className={campo} />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted">Fecha del desembolso (de ahí sale el día de pago mensual)</span>
        <input name="fecha" type="date" required defaultValue={hoy} max={hoy} className={campo} />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted">Para un externo (opcional)</span>
        <input name="externo" maxLength={80} placeholder="Nombre del externo" className={campo} />
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted">Nota interna (opcional)</span>
        <input name="nota" maxLength={500} className={campo} />
      </label>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="cobrar_4x1000" defaultChecked className="size-4 accent-[var(--accent)]" />
        Cobrar el 4x1000 del desembolso
      </label>

      <button disabled={pendiente} className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-fg disabled:opacity-60">
        {pendiente ? "Registrando…" : "Registrar préstamo"}
      </button>
      {estado.ok && !pendiente && <p className="text-xs text-ok">Listo. El préstamo ya aparece en Vigentes.</p>}
      {estado.error && !pendiente && <p className="text-xs text-danger">{estado.error}</p>}
    </form>
  );
}
