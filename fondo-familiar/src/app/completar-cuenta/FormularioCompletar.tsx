"use client";

import { useActionState } from "react";
import { completarCuenta, type EstadoForm } from "@/lib/acciones";

const campo =
  "w-full rounded-2xl border border-card-border bg-card px-4 py-4 outline-none focus:border-accent";

export default function FormularioCompletar() {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(completarCuenta, {});

  return (
    <form action={accion} className="space-y-3">
      <input name="correo" type="email" required autoComplete="email" placeholder="Correo electrónico" className={campo} />
      <input name="clave" type="password" required minLength={8} autoComplete="new-password" placeholder="Nueva contraseña (mín. 8)" className={campo} />
      <input name="confirmar" type="password" required minLength={8} autoComplete="new-password" placeholder="Repite la contraseña" className={campo} />
      <input name="cuenta_pago" required placeholder="Cuenta o llave para que te hagan los pagos" className={campo} />
      <p className="px-1 text-xs text-muted">Ej: Nequi 3001234567, llave Bre-B o número de cuenta. La verán quienes deban consignarte la cadena.</p>
      {estado.error && <p className="text-sm text-danger">{estado.error}</p>}
      <button
        disabled={pendiente}
        className="w-full rounded-2xl bg-accent py-4 font-semibold text-accent-fg disabled:opacity-60"
      >
        {pendiente ? "Guardando…" : "Guardar y continuar"}
      </button>
    </form>
  );
}
