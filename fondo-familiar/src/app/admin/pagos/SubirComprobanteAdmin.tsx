"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { subirComprobanteAdmin, type EstadoForm } from "@/lib/acciones";
import { datosConImagenComprimida, errorDeArchivo } from "@/lib/comprimir";
import SelectorArchivo from "@/components/SelectorArchivo";

// Para el asociado que no supo subir su comprobante: el administrador lo carga por él.
export default function SubirComprobanteAdmin({
  cuotaId,
  tipo,
  titulo,
  directo = false,
}: {
  cuotaId: string;
  tipo: "fondo" | "cadena";
  titulo: string;
  directo?: boolean; // true: muestra el formulario sin el enlace previo
}) {
  const [abierto, setAbierto] = useState(directo);
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(subirComprobanteAdmin, {});
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
      <button type="button" onClick={() => setAbierto(true)} className="rounded-full bg-background px-3.5 py-2 text-xs font-semibold">
        Subir comprobante de {titulo}
      </button>
    );
  }

  return (
    <form onSubmit={alEnviar} className="space-y-2 rounded-xl border border-card-border p-3">
      <p className="text-xs text-muted">Comprobante de {titulo} (lo carga un administrador)</p>
      <input type="hidden" name="cuota_id" value={cuotaId} />
      <input type="hidden" name="tipo" value={tipo} />
      <SelectorArchivo titulo={`Elegir comprobante de ${titulo}`} />
      <div className="flex items-center gap-3">
        <button disabled={ocupado} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg disabled:opacity-60">
          {comprimiendo ? "Comprimiendo…" : pendiente ? "Subiendo…" : "Subir"}
        </button>
        {!directo && (
          <button type="button" onClick={() => setAbierto(false)} className="rounded-full bg-card px-4 py-2.5 text-xs font-semibold">
            Cancelar
          </button>
        )}
      </div>
      {estado.ok && !ocupado && <p className="text-xs text-ok">Subido. Ahora aparece para aprobar.</p>}
      {(errorLocal || estado.error) && !ocupado && <p className="text-xs text-danger">{errorLocal || estado.error}</p>}
    </form>
  );
}
