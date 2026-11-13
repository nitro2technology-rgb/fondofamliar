"use client";

import { useActionState, useState } from "react";
import { ChevronDown } from "lucide-react";
import Avatar from "@/components/Avatar";
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
  "w-full rounded-2xl border border-card-border bg-background px-4 py-3 text-sm outline-none focus:border-accent";

export default function FilaAsociado({ asociado: a, foto }: { asociado: Asociado; foto?: string | null }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(actualizarAsociado, {});
  const [abierto, setAbierto] = useState(false);

  return (
    <section className="rounded-[28px] bg-card p-4">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 text-left"
      >
        <Avatar nombre={a.nombre} size={44} foto={foto} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{a.nombre}</p>
          <p className="truncate text-xs text-muted">
            <span className="capitalize">{a.rol}</span>
            {a.ciudad && ` · ${a.ciudad}`}
            {a.celular && ` · ${a.celular}`}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
            a.primer_ingreso_completo ? "bg-accent-soft text-accent" : "bg-card-border text-muted"
          }`}
        >
          {a.primer_ingreso_completo ? "Activa" : "Sin ingresar"}
        </span>
        <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div className="mt-4 space-y-3">
          <form action={accion} className="space-y-2">
            <input type="hidden" name="id" value={a.id} />
            <input name="celular" type="tel" inputMode="numeric" defaultValue={a.celular ?? ""} placeholder="Celular" className={campo} />
            <input name="ciudad" list="ciudades" defaultValue={a.ciudad ?? ""} placeholder="Ciudad" className={campo} />
            <input name="cuenta_pago" defaultValue={a.cuenta_pago ?? ""} placeholder="Cuenta o llave para recibir pagos" className={campo} />
            <div className="flex items-center gap-3 pt-1">
              <button
                disabled={pendiente}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
              >
                {pendiente ? "Guardando…" : "Guardar"}
              </button>
              {estado.ok && <span className="text-sm text-ok">Guardado</span>}
              {estado.error && <span className="text-sm text-danger">{estado.error}</span>}
            </div>
          </form>
          {a.primer_ingreso_completo && (
            <form action={reiniciarPrimerIngreso}>
              <input type="hidden" name="id" value={a.id} />
              <button className="rounded-full bg-background px-4 py-2 text-xs font-semibold">Permitir nuevo primer ingreso</button>
            </form>
          )}
        </div>
      )}
    </section>
  );
}
