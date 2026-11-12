"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { subirCaptura, type EstadoForm } from "@/lib/acciones";
import { datosConImagenComprimida, errorDeArchivo } from "@/lib/comprimir";
import SelectorArchivo from "@/components/SelectorArchivo";

const campo = "w-full rounded-2xl bg-background px-4 py-3 text-sm outline-none ring-1 ring-card-border focus:ring-accent";

export default function FormularioCaptura({
  opciones,
  mesInicial,
}: {
  opciones: { valor: string; texto: string; subida: boolean }[];
  mesInicial: string;
}) {
  const [mes, setMes] = useState(mesInicial);
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(subirCaptura, {});
  const [comprimiendo, setComprimiendo] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const ocupado = pendiente || comprimiendo;
  const reemplaza = opciones.find((o) => o.valor === mes)?.subida;

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
    <form onSubmit={alEnviar} className="space-y-4 rounded-[28px] bg-card p-5">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1.5 text-xs font-medium text-muted">
          Mes de la captura
          <select name="mes" value={mes} onChange={(e) => setMes(e.target.value)} className={campo}>
            {opciones.map((o) => (
              <option key={o.valor} value={o.valor}>
                {o.texto}
                {o.subida ? " ✓" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1.5 text-xs font-medium text-muted">
          Saldo en NU (opcional)
          <input name="saldo" inputMode="numeric" placeholder="1500000" className={campo} />
        </label>
      </div>

      <SelectorArchivo titulo="Elegir captura de la cuenta NU" ayuda="Pantallazo del saldo a fin de mes" />

      {reemplaza && <p className="rounded-xl bg-accent-soft px-3 py-2 text-xs text-accent">Ese mes ya tiene captura: esta la reemplaza.</p>}

      <button disabled={ocupado} className="w-full rounded-full bg-foreground py-3.5 font-semibold text-background disabled:opacity-60">
        {comprimiendo ? "Comprimiendo…" : pendiente ? "Subiendo…" : "Subir captura"}
      </button>
      {estado.ok && !ocupado && <p className="text-center text-sm text-ok">Captura guardada ✓</p>}
      {(errorLocal || estado.error) && !ocupado && <p className="text-center text-sm text-danger">{errorLocal || estado.error}</p>}
    </form>
  );
}
