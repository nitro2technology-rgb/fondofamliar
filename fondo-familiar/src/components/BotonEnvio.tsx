"use client";

import { useFormStatus } from "react-dom";

// Botón de envío que se deshabilita mientras la acción del formulario se está procesando.
export default function BotonEnvio({
  children,
  enviando = "Guardando…",
  className = "",
}: {
  children: React.ReactNode;
  enviando?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? enviando : children}
    </button>
  );
}
