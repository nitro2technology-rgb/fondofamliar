"use client";

import { useActionState } from "react";
import { actualizarAsociado, reiniciarPrimerIngreso, type EstadoForm } from "@/lib/acciones";

type Asociado = {
  id: string;
  nombre: string;
  rol: string;
  celular: string | null;
  ciudad: string | null;
  cuenta_pago: string | null;
  primer_ingreso_completo: boolean;
};

const campo =
  "w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

export default function FilaAsociado({ asociado: a }: { asociado: Asociado }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(actualizarAsociado, {});

  return (
    <div className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{a.nombre}</p>
          <p className="text-xs capitalize text-muted">{a.rol}</p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs ${
            a.primer_ingreso_completo ? "bg-accent-soft text-accent" : "bg-card-border text-muted"
          }`}
        >
          {a.primer_ingreso_completo ? "Cuenta activa" : "Sin ingresar"}
        </span>
      </div>
      <form action={accion} className="space-y-2">
        <input type="hidden" name="id" value={a.id} />
        <input name="celular" type="tel" inputMode="numeric" defaultValue={a.celular ?? ""} placeholder="Celular" className={campo} />
        <input name="ciudad" list="ciudades" defaultValue={a.ciudad ?? ""} placeholder="Ciudad" className={campo} />
        <input name="cuenta_pago" defaultValue={a.cuenta_pago ?? ""} placeholder="Cuenta o llave para recibir pagos" className={campo} />
        <div className="flex items-center gap-3">
          <button disabled={pendiente} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60">
            {pendiente ? "Guardando…" : "Guardar"}
          </button>
          {estado.ok && <span className="text-sm text-ok">Guardado</span>}
          {estado.error && <span className="text-sm text-danger">{estado.error}</span>}
        </div>
      </form>
      {a.primer_ingreso_completo && (
        <form action={reiniciarPrimerIngreso}>
          <input type="hidden" name="id" value={a.id} />
          <button className="text-xs text-muted underline">Permitir nuevo primer ingreso</button>
        </form>
      )}
    </div>
  );
}
