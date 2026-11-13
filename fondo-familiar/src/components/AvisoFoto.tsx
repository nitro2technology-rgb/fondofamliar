"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Camera, X } from "lucide-react";

const LLAVE = "aviso_foto_cerrado";
const sinSuscripcion = () => () => {};
const leer = () => {
  try {
    return localStorage.getItem(LLAVE) === "1";
  } catch {
    return false;
  }
};

// Invita (sin obligar) a agregar la foto de perfil. Se puede cerrar y no vuelve a salir en ese dispositivo.
export default function AvisoFoto() {
  const cerradoAntes = useSyncExternalStore(sinSuscripcion, leer, () => true);
  const [cerrado, setCerrado] = useState(false);
  if (cerradoAntes || cerrado) return null;

  function cerrar() {
    try {
      localStorage.setItem(LLAVE, "1");
    } catch {
      /* sin almacenamiento */
    }
    setCerrado(true);
  }

  return (
    <section className="flex items-center gap-3 rounded-[28px] bg-card p-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
        <Camera size={20} />
      </span>
      <Link href="/perfil#foto" className="min-w-0 flex-1">
        <p className="font-semibold">Agrega tu foto de perfil</p>
        <p className="text-xs text-muted">Es opcional. Toca aquí para subirla.</p>
      </Link>
      <button onClick={cerrar} aria-label="Ahora no" className="shrink-0 rounded-full bg-background p-2 text-muted">
        <X size={16} />
      </button>
    </section>
  );
}
