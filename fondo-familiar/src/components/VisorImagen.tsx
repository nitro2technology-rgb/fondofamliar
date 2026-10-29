"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

// Muestra una imagen en una ventana flotante dentro de la misma página.
export default function VisorImagen({ url, texto = "Ver captura" }: { url: string; texto?: string }) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const alTecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [abierto]);

  return (
    <>
      <button type="button" onClick={() => setAbierto(true)} className="text-sm text-accent underline">
        {texto}
      </button>
      {abierto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setAbierto(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <button
            type="button"
            onClick={() => setAbierto(false)}
            aria-label="Cerrar"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-full bg-white/15 text-white"
          >
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt="Captura"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-xl object-contain"
          />
        </div>
      )}
    </>
  );
}
