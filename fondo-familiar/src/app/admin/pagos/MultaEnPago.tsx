"use client";

import { useState, useTransition } from "react";
import { marcarMultaPagada } from "@/lib/acciones";

// Multa pendiente de un asociado, junto a su pago de cuota: el directivo revisa el comprobante y decide
// si la multa venía incluida en esa transferencia (queda cobrada) o si sigue debiéndola.
export default function MultaEnPago({ id, motivo, monto }: { id: string; motivo: string; monto: string }) {
  const [pagada, setPagada] = useState(false);
  const [enviando, iniciar] = useTransition();

  function cambiar(si: boolean) {
    if (enviando) return;
    const datos = new FormData();
    datos.set("id", id);
    datos.set("pagada", si ? "si" : "no");
    setPagada(si);
    iniciar(async () => {
      try {
        await marcarMultaPagada(datos);
      } catch {
        setPagada(!si);
      }
    });
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 rounded-2xl px-3 py-2.5 ${pagada ? "bg-accent-soft" : "bg-danger/10"}`}>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-semibold ${pagada ? "text-accent" : "text-danger"}`}>{pagada ? "Multa cobrada" : "Debe la multa"}</p>
        <p className="text-xs text-muted">
          {motivo} · {monto}
        </p>
      </div>
      <button
        type="button"
        disabled={enviando}
        onClick={() => cambiar(!pagada)}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${pagada ? "bg-background text-muted" : "bg-accent text-accent-fg"}`}
      >
        {pagada ? "Deshacer" : "Venía en este pago"}
      </button>
    </div>
  );
}
