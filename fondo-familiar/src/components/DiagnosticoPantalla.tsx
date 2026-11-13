"use client";

import { useState } from "react";

// Mide el tamaño real de la pantalla en el celular (para ajustar el menú inferior al borde).
export default function DiagnosticoPantalla() {
  const [datos, setDatos] = useState<string[] | null>(null);

  function medir() {
    const sonda = document.createElement("div");
    sonda.style.cssText =
      "position:fixed;left:0;top:0;visibility:hidden;padding-top:env(safe-area-inset-top);padding-bottom:env(safe-area-inset-bottom)";
    document.body.appendChild(sonda);
    const cs = getComputedStyle(sonda);
    const margenes = `${cs.paddingTop} / ${cs.paddingBottom}`;
    const fijo = document.createElement("div");
    fijo.style.cssText = "position:fixed;left:0;right:0;top:0;bottom:0;visibility:hidden";
    document.body.appendChild(fijo);
    const f = fijo.getBoundingClientRect();
    sonda.remove();
    fijo.remove();
    const nav = document.querySelector("nav[data-tour=nav]")?.getBoundingClientRect();
    const vv = window.visualViewport;
    setDatos([
      `Ventana: ${window.innerWidth} x ${window.innerHeight}`,
      `Pantalla: ${screen.width} x ${screen.height}`,
      `Margen seguro arriba / abajo: ${margenes}`,
      `Zona fija (top, alto): ${Math.round(f.top)}, ${Math.round(f.height)}`,
      `Visual viewport: ${vv ? `${Math.round(vv.width)} x ${Math.round(vv.height)} (arriba ${Math.round(vv.offsetTop)})` : "n/d"}`,
      `Menú (arriba, abajo, alto): ${nav ? `${Math.round(nav.top)}, ${Math.round(nav.bottom)}, ${Math.round(nav.height)}` : "n/d"}`,
      `Instalada: ${(navigator as unknown as { standalone?: boolean }).standalone ? "sí (iOS)" : matchMedia("(display-mode: standalone)").matches ? "sí" : "no"}`,
    ]);
  }

  return (
    <div className="text-center">
      <button type="button" onClick={medir} className="text-xs text-muted underline">
        Información de pantalla
      </button>
      {datos && (
        <ul className="mt-2 space-y-1 rounded-2xl bg-card p-3 text-left text-xs text-muted">
          {datos.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
