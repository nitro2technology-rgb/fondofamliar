"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Trash2, X } from "lucide-react";
import Avatar from "@/components/Avatar";
import { eliminarRecuerdo } from "@/lib/acciones";

export type FotoRecuerdo = {
  id: string;
  url: string;
  mini: string;
  nombre: string;
  foto: string | null;
  puedeBorrar: boolean;
};

// Cuadrícula de miniaturas; al tocar una se abre a pantalla completa con flechas.
export default function GaleriaRecuerdos({ fotos }: { fotos: FotoRecuerdo[] }) {
  const router = useRouter();
  const [abierta, setAbierta] = useState<number | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, setBorrando] = useState(false);

  useEffect(() => {
    if (abierta === null) return;
    const alTecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierta(null);
      if (e.key === "ArrowRight") setAbierta((i) => (i === null ? i : (i + 1) % fotos.length));
      if (e.key === "ArrowLeft") setAbierta((i) => (i === null ? i : (i - 1 + fotos.length) % fotos.length));
    };
    window.addEventListener("keydown", alTecla);
    return () => window.removeEventListener("keydown", alTecla);
  }, [abierta, fotos.length]);

  if (fotos.length === 0) {
    return <p className="rounded-[28px] bg-card p-6 text-center text-sm text-muted">Todavía no hay fotos de esta reunión. ¡Sé el primero en subir una!</p>;
  }

  const actual = abierta !== null ? fotos[abierta] : null;
  const mover = (d: number) => {
    setConfirmar(false);
    setAbierta((i) => (i === null ? i : (i + d + fotos.length) % fotos.length));
  };

  async function borrar() {
    if (!actual) return;
    setBorrando(true);
    await eliminarRecuerdo(actual.id);
    setBorrando(false);
    setConfirmar(false);
    setAbierta(null);
    router.refresh();
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5">
        {fotos.map((f, i) => (
          <button key={f.id} type="button" onClick={() => setAbierta(i)} className="aspect-square overflow-hidden rounded-2xl bg-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.mini} alt={`Foto de ${f.nombre}`} loading="lazy" className="size-full object-cover" />
          </button>
        ))}
      </div>

      {actual && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex flex-col bg-black/90" onClick={() => setAbierta(null)}>
          <div className="flex items-center gap-3 p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <Avatar nombre={actual.nombre} size={36} foto={actual.foto} />
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">{actual.nombre}</p>
            <span className="text-xs opacity-70">
              {(abierta ?? 0) + 1} / {fotos.length}
            </span>
            <button type="button" onClick={() => setAbierta(null)} aria-label="Cerrar" className="flex size-10 items-center justify-center rounded-full bg-white/15">
              <X size={20} />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={actual.url} alt={`Foto de ${actual.nombre}`} onClick={(e) => e.stopPropagation()} className="max-h-full max-w-full rounded-xl object-contain" />
            {fotos.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Anterior"
                  onClick={(e) => {
                    e.stopPropagation();
                    mover(-1);
                  }}
                  className="absolute left-2 flex size-10 items-center justify-center rounded-full bg-white/20 text-white"
                >
                  <ChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  aria-label="Siguiente"
                  onClick={(e) => {
                    e.stopPropagation();
                    mover(1);
                  }}
                  className="absolute right-2 flex size-10 items-center justify-center rounded-full bg-white/20 text-white"
                >
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>
          <div className="flex justify-center p-4" onClick={(e) => e.stopPropagation()}>
            {actual.puedeBorrar &&
              (confirmar ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">¿Borrar esta foto?</span>
                  <button type="button" disabled={borrando} onClick={borrar} className="rounded-full bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                    {borrando ? "Borrando…" : "Sí, borrar"}
                  </button>
                  <button type="button" onClick={() => setConfirmar(false)} className="rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white">
                    No
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => setConfirmar(true)} className="flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white">
                  <Trash2 size={16} /> Borrar
                </button>
              ))}
          </div>
        </div>
      )}
    </>
  );
}
