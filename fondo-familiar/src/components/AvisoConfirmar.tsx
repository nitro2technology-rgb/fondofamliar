"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Ventana emergente al entrar al panel cuando quien tiene el turno aún debe confirmar pagos.
// Se muestra una vez por sesión del navegador para no repetirse al volver al Inicio.
export default function AvisoConfirmar({ pendientes }: { pendientes: number }) {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("aviso-confirmar")) return;
      sessionStorage.setItem("aviso-confirmar", "1");
    } catch {
      // Sin almacenamiento disponible: se muestra igual.
    }
    // Solo el navegador sabe si ya se mostró en esta sesión; por eso se decide después de montar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAbierto(true);
  }, []);

  if (!abierto) return null;
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-card-border bg-card p-6">
        <h2 className="text-xl font-bold">Confirma los pagos de los demás socios</h2>
        <p className="text-sm text-muted">
          Tienes {pendientes} {pendientes === 1 ? "pago" : "pagos"} de cadena por confirmar. Revisa las capturas y marca si los recibiste.
        </p>
        <Link
          href="/recibos"
          onClick={() => setAbierto(false)}
          className="block rounded-2xl bg-accent py-3 text-center font-semibold text-accent-fg"
        >
          Confirmar ahora
        </Link>
        <button type="button" onClick={() => setAbierto(false)} className="w-full text-sm text-muted underline">
          Más tarde
        </button>
      </div>
    </div>
  );
}
