"use client";

import { useActionState, useState } from "react";
import { Hourglass, Sparkles } from "lucide-react";
import { solicitarPrestamo, type EstadoForm } from "@/lib/acciones";

const pesos = (n: number) => `$${n.toLocaleString("es-CO")}`;

// Tarjeta de solicitud rápida: pedir todo lo disponible (hasta el tope) u otro monto.
// Pedir más de lo que hay no se rechaza: la solicitud queda en cola por orden de radicación.
export default function SolicitudRapida({ caja, tope }: { caja: number; tope: number }) {
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(solicitarPrestamo, {});
  const [otro, setOtro] = useState(false);
  const todo = Math.min(tope, Math.max(0, caja));
  const hayCaja = caja > 0;
  const pideMonto = otro || !hayCaja;

  if (estado.ok) {
    return (
      <div className="rounded-[28px] bg-accent-soft p-5 text-center">
        <p className="font-bold text-accent">¡Solicitud enviada!</p>
        <p className="mt-1 text-sm text-muted">Los directivos la votarán y quedó en cola por orden de llegada.</p>
      </div>
    );
  }

  return (
    <section data-tour="solicitud" className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0b7a57] to-[#0e3b2e] p-5 text-white shadow-xl">
      <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-white/15 blur-2xl" />
      <div className="relative space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium opacity-90">
          {hayCaja ? <Sparkles size={16} /> : <Hourglass size={16} />}
          {hayCaja ? "Hay dinero para prestar" : "Sin saldo por ahora"}
        </div>
        <div>
          <p className="text-4xl font-extrabold tracking-tight">{pesos(Math.max(0, caja))}</p>
          <p className="text-sm opacity-80">
            {hayCaja
              ? `Disponible para prestar · tope por persona ${pesos(tope)}`
              : "Puedes solicitar igual y quedar en cola: se desembolsa cuando haya saldo."}
          </p>
        </div>

        <form action={accion} className="space-y-3">
          {pideMonto ? (
            <input
              name="monto"
              inputMode="numeric"
              placeholder="¿Cuánto necesitas? Ej: 300000"
              className="w-full rounded-full bg-white/95 px-5 py-3.5 text-sm font-medium text-black outline-none placeholder:text-black/50"
            />
          ) : (
            <input type="hidden" name="monto" value={todo} />
          )}
          <div className="grid gap-2">
            <button disabled={pendiente} className="rounded-full bg-white py-3.5 text-sm font-bold text-black disabled:opacity-60">
              {pendiente ? "Enviando…" : pideMonto ? "Solicitar este monto" : `Solicitar ${pesos(todo)} ahora`}
            </button>
            {hayCaja && (
              <button type="button" onClick={() => setOtro((v) => !v)} className="rounded-full bg-white/15 py-3 text-sm font-semibold">
                {otro ? `Mejor pedir todo (${pesos(todo)})` : "Pedir otro monto"}
              </button>
            )}
          </div>
          {otro && <p className="text-xs opacity-80">Si pides más de lo disponible, quedas en cola hasta que haya saldo.</p>}
          {estado.error && <p className="rounded-xl bg-black/25 px-3 py-2 text-sm">{estado.error}</p>}
        </form>
      </div>
    </section>
  );
}
