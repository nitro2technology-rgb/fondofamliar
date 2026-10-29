"use client";

import { useActionState } from "react";
import { guardarCuentaPago, type EstadoForm } from "@/lib/acciones";

export default function FormularioCuenta({ actual }: { actual: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(guardarCuentaPago, {});
  return (
    <form action={accion} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
      <h2 className="font-semibold">Cuenta para recibir pagos</h2>
      <p className="text-xs text-muted">La verán quienes deban consignarte la cadena el mes de tu turno.</p>
      <input
        name="cuenta_pago"
        defaultValue={actual}
        placeholder="Ej: Nequi 3001234567 o llave Bre-B"
        className="w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      <div className="flex items-center gap-3">
        <button disabled={pendiente} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60">
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
        {estado.ok && !pendiente && <span className="text-sm text-ok">Guardada</span>}
        {estado.error && !pendiente && <span className="text-sm text-danger">{estado.error}</span>}
      </div>
    </form>
  );
}
