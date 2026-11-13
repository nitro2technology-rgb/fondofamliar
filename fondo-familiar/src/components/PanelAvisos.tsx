"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, X } from "lucide-react";
import { marcarAvisosLeidos } from "@/lib/acciones";

export type AvisoResumen = { id: string; titulo: string; cuerpo: string; url: string | null; leido: boolean; creado_en: string };

function hace(iso: string) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

// Campana con una pestañita desplegable: muestra los últimos avisos sin salir de la pantalla.
export default function PanelAvisos({ avisos, sinLeer, verTodos }: { avisos: AvisoResumen[]; sinLeer: number; verTodos: string }) {
  const [abierto, setAbierto] = useState(false);
  const [leidos, setLeidos] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent | TouchEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("touchstart", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("touchstart", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  function alternar() {
    const abrir = !abierto;
    setAbierto(abrir);
    // Al abrir se marcan como leídos; en pantalla siguen resaltados hasta cerrar.
    if (abrir && sinLeer > 0 && !leidos) {
      setLeidos(true);
      void marcarAvisosLeidos();
    }
  }

  const pendientes = leidos ? 0 : sinLeer;

  return (
    <div ref={caja} className="relative" data-tour="avisos">
      <button
        type="button"
        onClick={alternar}
        aria-expanded={abierto}
        aria-label={pendientes > 0 ? `Avisos: ${pendientes} sin leer` : "Avisos"}
        className="relative flex size-11 items-center justify-center rounded-full border border-card-border bg-card text-foreground"
      >
        <Bell size={20} className={pendientes > 0 ? "text-amber" : ""} />
        {pendientes > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-5 items-center justify-center rounded-full bg-amber px-1 text-[11px] font-bold leading-5 text-accent-fg">
            {pendientes > 9 ? "9+" : pendientes}
          </span>
        )}
      </button>

      {abierto && (
        <div className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+4.75rem)] z-40 mx-auto max-w-sm overflow-hidden rounded-[28px] border border-card-border bg-card shadow-2xl">
          <div className="flex items-center justify-between px-5 pb-2 pt-4">
            <p className="font-bold">Notificaciones</p>
            <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar" className="flex size-8 items-center justify-center rounded-full bg-background text-muted">
              <X size={16} />
            </button>
          </div>

          {avisos.length === 0 ? (
            <p className="px-5 pb-5 pt-2 text-sm text-muted">Aún no tienes avisos. Aquí verás cuándo te toca pagar, lo de tu préstamo y cuando haya dinero disponible.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-card-border/60 overflow-y-auto px-2">
              {avisos.map((a) => {
                const contenido = (
                  <div className={`flex gap-3 rounded-2xl px-3 py-3 ${!a.leido ? "bg-accent-soft" : ""}`}>
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-background text-accent">
                      <Bell size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug">{a.titulo}</p>
                      <p className="text-xs text-muted">{a.cuerpo}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{hace(a.creado_en)}</p>
                    </div>
                  </div>
                );
                return (
                  <li key={a.id} className="py-1">
                    {a.url ? (
                      <Link href={a.url} onClick={() => setAbierto(false)} className="block">
                        {contenido}
                      </Link>
                    ) : (
                      contenido
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          <Link href={verTodos} onClick={() => setAbierto(false)} className="block border-t border-card-border/60 px-5 py-3.5 text-center text-sm font-semibold text-accent">
            Ver todos los avisos
          </Link>
        </div>
      )}
    </div>
  );
}
