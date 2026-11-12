"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { Upload } from "lucide-react";
import { subirPagoPrestamoAdmin, type EstadoForm } from "@/lib/acciones";
import { datosConImagenComprimida, errorDeArchivo } from "@/lib/comprimir";
import SelectorArchivo from "@/components/SelectorArchivo";

const campo = "w-full rounded-xl bg-card px-3 py-2.5 text-sm outline-none ring-1 ring-card-border focus:ring-accent";

// El administrador sube por el deudor el comprobante de un pago de préstamo. Los montos llegan sugeridos.
export default function SubirPagoPrestamoAdmin({
  prestamoId,
  interes,
  mora,
}: {
  prestamoId: string;
  interes: number;
  mora: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(subirPagoPrestamoAdmin, {});
  const [comprimiendo, setComprimiendo] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const ocupado = pendiente || comprimiendo;

  async function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ocupado) return;
    setComprimiendo(true);
    const datos = await datosConImagenComprimida(e.currentTarget);
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
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 rounded-full bg-background px-3 py-2 text-xs font-semibold"
      >
        <Upload size={14} />
        Subir comprobante
      </button>
    );
  }

  return (
    <form onSubmit={alEnviar} className="w-full space-y-3 rounded-2xl bg-background p-3">
      <input type="hidden" name="prestamo_id" value={prestamoId} />
      <p className="text-xs text-muted">Lo carga un administrador. Después aparece en «Por revisar».</p>
      <div className="grid grid-cols-3 gap-2">
        {[
          ["interes", "Interés", interes],
          ["mora", "Mora", mora],
          ["capital", "Capital", 0],
        ].map(([n, t, v]) => (
          <label key={String(n)} className="space-y-1 text-xs text-muted">
            {t}
            <input name={String(n)} inputMode="numeric" defaultValue={Number(v) > 0 ? String(v) : ""} placeholder="0" className={campo} />
          </label>
        ))}
      </div>
      <SelectorArchivo titulo="Elegir comprobante" />
      <div className="flex items-center gap-3">
        <button disabled={ocupado} className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background disabled:opacity-60">
          {comprimiendo ? "Comprimiendo…" : pendiente ? "Subiendo…" : "Subir"}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="rounded-full bg-card px-4 py-2.5 text-xs font-semibold">
          Cerrar
        </button>
      </div>
      {estado.ok && !ocupado && <p className="text-xs text-ok">Subido. Revísalo arriba para aprobarlo.</p>}
      {(errorLocal || estado.error) && !ocupado && <p className="text-xs text-danger">{errorLocal || estado.error}</p>}
    </form>
  );
}
