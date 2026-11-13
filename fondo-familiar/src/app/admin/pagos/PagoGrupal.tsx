"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { subirPagoGrupal, type EstadoForm } from "@/lib/acciones";
import { datosConImagenComprimida, errorDeArchivo } from "@/lib/comprimir";
import SelectorArchivo from "@/components/SelectorArchivo";

type Persona = { id: string; nombre: string };

// Un solo comprobante para varias personas (efectivo recolectado por alguien que luego transfirió todo junto).
// Se copia en cada asociado marcado, con la descripción que escriba el directivo.
export default function PagoGrupal({ periodo, deben, personas }: { periodo: string; deben: Persona[]; personas: Persona[] }) {
  const [abierto, setAbierto] = useState(false);
  const [marcados, setMarcados] = useState<string[]>([]);
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(subirPagoGrupal, {});
  const [comprimiendo, setComprimiendo] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const ocupado = pendiente || comprimiendo;

  function alternar(id: string) {
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  async function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ocupado) return;
    if (marcados.length === 0) return setErrorLocal("Marca al menos un asociado.");
    const form = e.currentTarget;
    setComprimiendo(true);
    const datos = await datosConImagenComprimida(form);
    setComprimiendo(false);
    const problema = errorDeArchivo(datos);
    setErrorLocal(problema ?? "");
    if (problema) return;
    if (!String(datos.get("descripcion") ?? "").trim()) datos.set("descripcion", `Pago dividido en ${marcados.length}`);
    startTransition(() => accion(datos));
  }

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="w-full rounded-full border border-card-border bg-card py-3.5 text-sm font-semibold">
        Registrar pago en efectivo / de varios
      </button>
    );
  }

  const campo = "w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent";

  return (
    <form onSubmit={alEnviar} className="space-y-3 rounded-[28px] bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold">Pago en efectivo / de varios</p>
        <button type="button" onClick={() => setAbierto(false)} className="text-xs text-muted">
          Cerrar
        </button>
      </div>
      <p className="text-xs text-muted">
        Una persona recogió el dinero de varios y transfirió todo junto: sube el pantallazo una sola vez y se copia en cada asociado marcado. Después cada
        pago aparece para aprobar.
      </p>
      <input type="hidden" name="periodo" value={periodo} />

      <label className="block space-y-1">
        <span className="text-xs text-muted">Qué cubre</span>
        <select name="tipo" defaultValue="fondo" className={campo}>
          <option value="fondo">Cuota del fondo (ahorro + juegos)</option>
          <option value="cadena">Cadena</option>
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted">Quién recolectó y transfirió el dinero</span>
        <select name="recolector_id" defaultValue="" className={campo}>
          <option value="">— No aplica —</option>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1">
        <span className="text-xs text-muted">Descripción (opcional)</span>
        <input name="descripcion" maxLength={120} placeholder={`Pago dividido en ${marcados.length || "N"}`} className={campo} />
      </label>

      <fieldset className="space-y-1">
        <legend className="text-xs text-muted">
          Asociados que pagaron en este pantallazo ({marcados.length} marcado{marcados.length === 1 ? "" : "s"})
        </legend>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-card-border p-2">
          {deben.length === 0 && <p className="p-2 text-xs text-muted">Nadie debe este mes.</p>}
          {deben.map((p) => (
            <label key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm">
              <input type="checkbox" name="asociados" value={p.id} checked={marcados.includes(p.id)} onChange={() => alternar(p.id)} className="size-4 accent-[var(--accent)]" />
              {p.nombre}
            </label>
          ))}
        </div>
      </fieldset>

      <SelectorArchivo titulo="Elegir pantallazo de la transferencia" />

      <button disabled={ocupado} className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-fg disabled:opacity-60">
        {comprimiendo ? "Comprimiendo…" : pendiente ? "Registrando…" : `Registrar para ${marcados.length || "los"} marcado${marcados.length === 1 ? "" : "s"}`}
      </button>
      {estado.ok && !ocupado && <p className="text-xs text-ok">Listo. Ahora aparece cada pago para aprobar.</p>}
      {(errorLocal || estado.error) && !ocupado && <p className="text-xs text-danger">{errorLocal || estado.error}</p>}
    </form>
  );
}
