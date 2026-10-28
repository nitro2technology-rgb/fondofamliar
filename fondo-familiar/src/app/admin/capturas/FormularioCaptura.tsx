"use client";

import { useActionState } from "react";
import { subirCaptura, type EstadoForm } from "@/lib/acciones";

const campo =
  "w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default function FormularioCaptura({ mesActual }: { mesActual: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(subirCaptura, {});
  return (
    <form action={accion} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Mes</span>
        <input type="month" name="mes" defaultValue={mesActual} className={campo} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Saldo que muestra la cuenta (opcional)</span>
        <input name="saldo" inputMode="numeric" placeholder="Ej: 1500000" className={campo} />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="text-muted">Captura de pantalla</span>
        <input type="file" name="archivo" accept="image/*" className={campo} />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pendiente} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60">
          {pendiente ? "Subiendo…" : "Subir captura"}
        </button>
        {estado.ok && <span className="text-sm text-ok">Guardada</span>}
        {estado.error && <span className="text-sm text-danger">{estado.error}</span>}
      </div>
    </form>
  );
}
