"use client";

import { useActionState } from "react";
import { primerIngreso, type EstadoForm } from "@/lib/acciones";

export default function FormularioPrimerIngreso() {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(primerIngreso, {});

  return (
    <form action={accion} className="space-y-3">
      <input
        name="celular"
        type="tel"
        inputMode="numeric"
        autoComplete="tel"
        required
        placeholder="Celular (10 dígitos)"
        className="w-full rounded-2xl border border-card-border bg-card px-4 py-4 outline-none focus:border-accent"
      />
      {estado.error && <p className="text-sm text-danger">{estado.error}</p>}
      <button
        disabled={pendiente}
        className="w-full rounded-2xl bg-accent py-4 font-semibold text-accent-fg disabled:opacity-60"
      >
        {pendiente ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
