"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Sparkles } from "lucide-react";
import { marcarTutorialVisto } from "@/lib/acciones";
import { PASOS_ADMIN, PASOS_ASOCIADO } from "@/lib/tutorial";

type Caja = { top: number; left: number; width: number; height: number };

const ANCHO_BURBUJA = 320;
const MARGEN = 12;

function buscar(objetivo?: string[]): HTMLElement | null {
  for (const o of objetivo ?? []) {
    const el = document.querySelector<HTMLElement>(`[data-tour="${o}"]`);
    if (el && el.getClientRects().length > 0) return el;
  }
  return null;
}

// Recorrido guiado sobre la pantalla: resalta cada elemento y muestra una burbuja que explica qué hacer ahí.
// Se abre solo la primera vez (`abrirAlInicio`) o con ?tutorial=1 (enlace de Perfil / Más).
export default function Tutorial({ panel, abrirAlInicio = false }: { panel: "asociado" | "admin"; abrirAlInicio?: boolean }) {
  const pasos = panel === "admin" ? PASOS_ADMIN : PASOS_ASOCIADO;
  const router = useRouter();
  const pathname = usePathname();
  const pedido = useSearchParams().get("tutorial") === "1";

  const [cerrado, setCerrado] = useState(false);
  const [i, setI] = useState(0);
  const [caja, setCaja] = useState<Caja | null>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [hb, setHb] = useState(0);
  // Altura real de la burbuja, para ubicarla sin que se salga de la pantalla.
  const refBurbuja = useCallback((n: HTMLDivElement | null) => {
    if (!n) return;
    const ro = new ResizeObserver(() => setHb(n.offsetHeight));
    ro.observe(n);
    setHb(n.offsetHeight);
    return () => ro.disconnect();
  }, []);
  const abierto = (abrirAlInicio || pedido) && !cerrado;
  const paso = pasos[i];

  const medir = useCallback(() => {
    setVp({ w: window.innerWidth, h: window.innerHeight });
    const el = buscar(paso.objetivo);
    if (!el) return setCaja(null);
    const r = el.getBoundingClientRect();
    // Se recorta a la zona visible para elementos más altos que la pantalla.
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, window.innerHeight, top + window.innerHeight * 0.5);
    setCaja({ top, left: r.left, width: r.width, height: Math.max(bottom - top, 0) });
  }, [paso]);

  // Al cambiar de paso, lleva el elemento a la vista y mide.
  useEffect(() => {
    if (!abierto) return;
    const el = buscar(paso.objetivo);
    const zona = el?.closest<HTMLElement>("[data-scroll]");
    if (el && zona) {
      // El elemento sube a la parte alta para dejar abajo todo el espacio a la burbuja.
      el.scrollIntoView({ block: "start", behavior: "smooth" });
      zona.scrollBy({ top: -72, behavior: "smooth" });
    }
    const t = setTimeout(medir, 60);
    return () => clearTimeout(t);
  }, [abierto, paso, medir]);

  useEffect(() => {
    if (!abierto) return;
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", medir, true);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", medir, true);
    };
  }, [abierto, medir]);

  function cerrar() {
    setCerrado(true);
    setI(0);
    void marcarTutorialVisto(panel);
    if (pedido) router.replace(pathname);
  }

  if (!abierto || vp.w === 0) return null; // el tamaño de pantalla se mide justo después de montar

  const ultimo = i === pasos.length - 1;
  const ancho = Math.min(ANCHO_BURBUJA, vp.w - MARGEN * 2);
  const relleno = 8;
  const foco = caja && caja.height > 0 ? { top: caja.top - relleno, left: caja.left - relleno, width: caja.width + relleno * 2, height: caja.height + relleno * 2 } : null;

  // Burbuja: siempre dentro de la pantalla (con desplazamiento interno si el texto es largo).
  const minTop = 56;
  const maxBottom = vp.h - 24;
  const maxH = maxBottom - minTop;
  const alto = Math.min(hb, maxH);
  let estiloBurbuja: React.CSSProperties = { width: ancho, left: (vp.w - ancho) / 2, top: minTop + (maxH - alto) / 2 };
  let flecha: { lado: "arriba" | "abajo"; x: number } | null = null;
  if (foco) {
    const espacioAbajo = maxBottom - (foco.top + foco.height) - 14;
    const espacioArriba = foco.top - minTop - 14;
    const centro = foco.left + foco.width / 2;
    const left = Math.min(Math.max(centro - ancho / 2, MARGEN), vp.w - ancho - MARGEN);
    const x = Math.min(Math.max(centro - left, 24), ancho - 24);
    if (espacioAbajo >= alto) {
      estiloBurbuja = { width: ancho, left, top: foco.top + foco.height + 14 };
      flecha = { lado: "arriba", x };
    } else if (espacioArriba >= alto) {
      estiloBurbuja = { width: ancho, left, top: foco.top - 14 - alto };
      flecha = { lado: "abajo", x };
    } else {
      estiloBurbuja = { width: ancho, left, top: maxBottom - alto };
    }
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Tutorial">
      {/* Bloquea toques en la página y oscurece; si hay foco, el recorte lo hace la sombra del recuadro */}
      <div className="absolute inset-0" style={foco ? undefined : { background: "rgba(0,0,0,0.72)" }} />
      {foco && (
        <div
          className="pointer-events-none absolute rounded-3xl ring-2 ring-accent transition-all duration-200"
          style={{ ...foco, boxShadow: "0 0 0 9999px rgba(0,0,0,0.72)" }}
        />
      )}

      <div ref={refBurbuja} className="absolute overflow-y-auto rounded-3xl bg-card p-5 text-foreground shadow-2xl ring-1 ring-card-border" style={{ ...estiloBurbuja, maxHeight: maxH }}>
        {flecha && (
          <span
            className={`absolute size-4 rotate-45 bg-card ring-1 ring-card-border ${flecha.lado === "arriba" ? "-top-2" : "-bottom-2"}`}
            style={{ left: flecha.x - 8 }}
          />
        )}
        <div className="relative">
          <div className="mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-accent">
              {!foco && <Sparkles size={14} />}
              Paso {i + 1} de {pasos.length}
            </span>
            {!ultimo && (
              <button type="button" onClick={cerrar} className="text-xs font-medium text-muted">
                Omitir
              </button>
            )}
          </div>
          <h2 className="text-lg font-extrabold leading-tight">{paso.titulo}</h2>
          <p className="mt-1.5 text-sm text-muted">{paso.texto}</p>
          {paso.puntos && (
            <ul className="mt-3 space-y-1.5">
              {paso.puntos.map((p) => (
                <li key={p} className="flex items-start gap-2 text-sm">
                  <Check size={14} className="mt-0.5 shrink-0 text-accent" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 flex items-center gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)} className="rounded-full bg-background px-4 py-2.5 text-sm font-semibold">
                Atrás
              </button>
            )}
            <button
              type="button"
              onClick={() => (ultimo ? cerrar() : setI(i + 1))}
              className="flex-1 rounded-full bg-accent py-2.5 text-sm font-semibold text-accent-fg"
            >
              {ultimo ? "Empezar" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
