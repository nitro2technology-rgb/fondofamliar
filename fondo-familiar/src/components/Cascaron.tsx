"use client";

import { useSyncExternalStore } from "react";

// En Safari con la app instalada, iOS informa una ventana más corta que la pantalla (le resta la barra de estado)
// y todo lo «fijo» termina por encima del borde de abajo. Con la app instalada y en vertical se usa el alto real de la pantalla.
function suscribir(cb: () => void) {
  window.addEventListener("resize", cb);
  window.addEventListener("orientationchange", cb);
  return () => {
    window.removeEventListener("resize", cb);
    window.removeEventListener("orientationchange", cb);
  };
}

function altoReal() {
  const instalada = (navigator as unknown as { standalone?: boolean }).standalone || matchMedia("(display-mode: standalone)").matches;
  const vertical = window.innerHeight > window.innerWidth;
  return instalada && vertical ? Math.max(window.innerHeight, screen.height) : 0;
}

// Estructura fija de la app: la pantalla completa se divide en zona con desplazamiento + menú inferior.
// El menú es parte de la columna (no «position: fixed») y queda siempre pegado al borde de abajo.
export default function Cascaron({ children, menu }: { children: React.ReactNode; menu: React.ReactNode }) {
  const alto = useSyncExternalStore(suscribir, altoReal, () => 0);
  return (
    <div
      className="fixed inset-x-0 top-0 flex flex-col bg-background pt-[env(safe-area-inset-top)]"
      style={alto > 0 ? { height: alto } : { bottom: 0 }}
    >
      <div data-scroll className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
        {children}
      </div>
      {menu}
    </div>
  );
}
