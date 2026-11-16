"use client";

import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";

// Cuenta del fondo (Nu) a la que se hacen los pagos al fondo y de préstamos.
const DATOS = [
  { etiqueta: "Llave Nu", valor: "@PCG269" },
  { etiqueta: "Cuenta de ahorros Nu", valor: "19691221" },
  { etiqueta: "C.C.", valor: "1085273269" },
] as const;

function Copiable({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(valor);
    } catch {
      // Respaldo para navegadores sin acceso al portapapeles.
      const t = document.createElement("textarea");
      t.value = valor;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-background px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-muted">{etiqueta}</p>
        <p className="truncate text-lg font-extrabold tracking-tight">{valor}</p>
      </div>
      <button
        type="button"
        onClick={copiar}
        className="flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-fg"
      >
        {copiado ? <Check size={14} /> : <Copy size={14} />}
        {copiado ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export default function CuentaFondo() {
  return (
    <section data-tour="cuenta-fondo" className="space-y-3 rounded-[28px] bg-card p-5">
      <div>
        <h2 className="text-lg font-bold">Paga a esta cuenta</h2>
        <p className="text-xs text-muted">
          Para el pago al fondo (ahorro + juegos) y para pagos de préstamo. Funciona desde cualquier entidad con Llaves. La cadena se paga a quien tiene el turno.
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-2xl bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/qr-fondo.png" alt="Código QR para pagar a la llave Nu @PCG269" className="size-52" />
        <a
          href="/qr-fondo.png"
          download="QR-Fondo-Familiar.png"
          className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-fg"
        >
          <Download size={14} /> Descargar código QR
        </a>
      </div>

      {DATOS.map((d) => (
        <Copiable key={d.etiqueta} {...d} />
      ))}
    </section>
  );
}
