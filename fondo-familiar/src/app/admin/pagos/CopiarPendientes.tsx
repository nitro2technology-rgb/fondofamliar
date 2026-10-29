"use client";

import { useState } from "react";

// Copia el texto de los pendientes para pegarlo en el grupo de WhatsApp.
export default function CopiarPendientes({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
    } catch {
      const area = document.createElement("textarea");
      area.value = texto;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="w-full rounded-xl border border-card-border px-4 py-2 text-sm font-medium"
    >
      {copiado ? "Copiado ✓ Pégalo en WhatsApp" : "Copiar lista de pendientes"}
    </button>
  );
}
