"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { desembolsarPrestamo, type EstadoForm } from "@/lib/acciones";
import { datosConImagenComprimida, errorDeArchivo } from "@/lib/comprimir";
import SelectorArchivo from "@/components/SelectorArchivo";

// Desembolso en dos pasos: se muestra la cuenta del beneficiario, se sube el comprobante y solo entonces se registra.
export default function FormularioDesembolso({
  id,
  cuenta,
  bloqueo,
}: {
  id: string;
  cuenta: string;
  bloqueo: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(desembolsarPrestamo, {});
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

  if (!abierto) {
    return (
      <button
        type="button"
        disabled={bloqueo}
        onClick={() => setAbierto(true)}
        className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-fg disabled:opacity-40"
      >
        Registrar desembolso
      </button>
    );
  }

  return (
    <form onSubmit={alEnviar} className="space-y-3 rounded-2xl bg-background p-3">
      <input type="hidden" name="id" value={id} />
      <div>
        <p className="text-xs text-muted">1. Transfiere a esta cuenta</p>
        {cuenta ? (
          <p className="select-all break-all text-base font-bold">{cuenta}</p>
        ) : (
          <p className="text-sm text-amber">No registró su cuenta. Pídesela antes de transferir.</p>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs text-muted">2. Sube el comprobante de la transferencia</p>
        <SelectorArchivo titulo="Subir comprobante" ayuda="Pantallazo de la transferencia al asociado" />
      </div>
      <p className="text-xs text-muted">Solo al confirmar se registra el desembolso y se descuenta de la caja.</p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={ocupado} onClick={() => setAbierto(false)} className="rounded-full bg-card py-3 text-sm font-semibold">
          Cancelar
        </button>
        <button disabled={ocupado} className="rounded-full bg-accent py-3 text-sm font-semibold text-accent-fg disabled:opacity-60">
          {comprimiendo ? "Comprimiendo…" : pendiente ? "Registrando…" : "Confirmar desembolso"}
        </button>
      </div>
      {(errorLocal || estado.error) && !ocupado && <p className="text-xs text-danger">{errorLocal || estado.error}</p>}
    </form>
  );
}
