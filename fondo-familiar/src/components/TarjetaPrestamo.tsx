import { Simbolo } from "@/components/Logo";

// Tarjeta del préstamo con aspecto de tarjeta física (chip, marca y nombre del titular).
export default function TarjetaPrestamo({
  etiqueta,
  valor,
  titular,
  izquierda,
  derecha,
}: {
  etiqueta: string;
  valor: string;
  titular: string;
  izquierda?: { titulo: string; valor: string };
  derecha?: { titulo: string; valor: string };
}) {
  return (
    <div className="relative min-h-[15rem] w-full overflow-hidden rounded-[26px] bg-gradient-to-br from-[#0b7a57] to-[#0e3b2e] p-5 text-white shadow-2xl">
      {/* Brillo sobre la tarjeta */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_85%_0%,rgba(255,255,255,0.35),transparent_55%)]" />
      <div className="pointer-events-none absolute -bottom-16 -left-10 size-48 rounded-full bg-white/10 blur-2xl" />

      <div className="relative flex h-full min-h-[12.5rem] flex-col justify-between gap-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Simbolo size={30} color="#ffffff" semilla="#ffb547" />
            <p className="text-lg font-extrabold tracking-tight">Fondo Familiar</p>
          </div>
          <span className="rounded-full bg-black/25 px-3 py-1 text-xs font-medium">{etiqueta}</span>
        </div>

        <div className="flex items-end justify-between gap-3">
          {/* Chip */}
          <div className="grid h-9 w-12 shrink-0 grid-cols-3 grid-rows-3 gap-px overflow-hidden rounded-md bg-gradient-to-br from-[#ffe2a8] to-[#ffb547] p-px">
            {Array.from({ length: 9 }).map((_, i) => (
              <span key={i} className="bg-[#c98a1f]/40" />
            ))}
          </div>
          <p className="text-right text-3xl font-extrabold leading-none min-[380px]:text-4xl tracking-tight drop-shadow">{valor}</p>
        </div>

        <div className="flex items-end justify-between gap-3 text-xs">
          <div className="min-w-0">
            <p className="truncate font-semibold uppercase tracking-[0.18em] opacity-90">{titular}</p>
            {izquierda && (
              <p className="mt-1 opacity-75">
                {izquierda.titulo}: <span className="font-semibold">{izquierda.valor}</span>
              </p>
            )}
          </div>
          {derecha && (
            <p className="shrink-0 text-right opacity-75">
              {derecha.titulo}
              <br />
              <span className="font-semibold">{derecha.valor}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
