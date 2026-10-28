"use client";

import { useActionState } from "react";
import { solicitarPrestamo, type EstadoForm } from "@/lib/acciones";

const campo =
  "w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default function FormularioSolicitud() {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(solicitarPrestamo, {});
  return (
    <form action={accion} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
      <h2 className="font-semibold">Solicitar préstamo</h2>
      <input name="monto" inputMode="numeric" placeholder="Monto, ej: 300000" className={campo} />
      <input name="externo" placeholder="Externo que apadrinas (opcional)" className={campo} />
      <div className="flex items-center gap-3">
        <button disabled={pendiente} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60">
          {pendiente ? "Enviando…" : "Radicar solicitud"}
        </button>
        {estado.error && <span className="text-sm text-danger">{estado.error}</span>}
      </div>
    </form>
  );
}
