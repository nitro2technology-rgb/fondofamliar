"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, RefreshCw, X } from "lucide-react";

// Zona para elegir una imagen: botón grande con vista previa, nombre, peso y opción de cambiar o quitar.
// Mantiene un <input type="file"> real dentro del formulario, así que funciona con FormData.
export default function SelectorArchivo({
  name = "archivo",
  titulo = "Elegir imagen",
  ayuda = "Pantallazo o foto del comprobante",
}: {
  name?: string;
  titulo?: string;
  ayuda?: string;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<{ nombre: string; kb: number; vista: string } | null>(null);

  useEffect(() => () => void (archivo && URL.revokeObjectURL(archivo.vista)), [archivo]);

  function alElegir(f: File | undefined) {
    setArchivo(f ? { nombre: f.name, kb: Math.round(f.size / 1024), vista: URL.createObjectURL(f) } : null);
  }

  function quitar() {
    if (entrada.current) entrada.current.value = "";
    setArchivo(null);
  }

  return (
    <div>
      <input
        ref={entrada}
        type="file"
        name={name}
        accept="image/*"
        className="sr-only"
        onChange={(e) => alElegir(e.target.files?.[0])}
      />
      {archivo ? (
        <div className="flex items-center gap-3 rounded-2xl bg-background p-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={archivo.vista} alt="" className="size-16 shrink-0 rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{archivo.nombre}</p>
            <p className="text-xs text-muted">{archivo.kb} KB · se comprime al enviar</p>
          </div>
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            aria-label="Cambiar imagen"
            className="flex size-9 items-center justify-center rounded-full bg-card"
          >
            <RefreshCw size={16} />
          </button>
          <button type="button" onClick={quitar} aria-label="Quitar imagen" className="flex size-9 items-center justify-center rounded-full bg-card text-danger">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-accent/50 bg-accent-soft/40 px-4 py-4 text-left transition-colors active:bg-accent-soft"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
            <ImagePlus size={22} />
          </span>
          <span>
            <span className="block text-sm font-semibold">{titulo}</span>
            <span className="block text-xs text-muted">{ayuda}</span>
          </span>
        </button>
      )}
    </div>
  );
}
