"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { subirPagoPorVarios, type EstadoForm } from "@/lib/acciones";
import { datosConImagenComprimida, errorDeArchivo } from "@/lib/comprimir";
import SelectorArchivo from "@/components/SelectorArchivo";
import { pesos } from "@/lib/format";

export type OpcionPersona = { id: string; nombre: string; mes: string; fondo: number; cadena: number };

// Un solo comprobante para pagar la cuota de uno mismo y de otras personas.
export default function PagoPorVarios({ personas, yoId }: { personas: OpcionPersona[]; yoId: string }) {
  const [tipo, setTipo] = useState<"fondo" | "cadena">("fondo");
  const [marcados, setMarcados] = useState<string[]>([]);
  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(subirPagoPorVarios, {});
  const [comprimiendo, setComprimiendo] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const ocupado = pendiente || comprimiendo;

  const montoDe = (p: OpcionPersona) => (tipo === "fondo" ? p.fondo : p.cadena);
  const aplicables = personas.filter((p) => montoDe(p) > 0);
  // Tú siempre vas incluido (si tienes algo pendiente de este tipo); las demás personas se marcan a mano.
  const marcadosValidos = aplicables.filter((p) => p.id === yoId || marcados.includes(p.id));
  const total = marcadosValidos.reduce((s, p) => s + montoDe(p), 0);

  function alternar(id: string) {
    setMarcados((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  async function alEnviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ocupado) return;
    if (marcadosValidos.length === 0) return setErrorLocal("Marca al menos una persona.");
    const form = e.currentTarget;
    setComprimiendo(true);
    const datos = await datosConImagenComprimida(form);
    setComprimiendo(false);
    const problema = errorDeArchivo(datos);
    setErrorLocal(problema ?? "");
    if (problema) return;
    // Solo viajan las personas a las que aplica este tipo de pago.
    datos.delete("asociados");
    marcadosValidos.forEach((p) => datos.append("asociados", p.id));
    startTransition(() => accion(datos));
  }

  const pildora = (activo: boolean) =>
    `flex-1 rounded-full px-3 py-2 text-center text-sm font-semibold ${activo ? "bg-accent text-accent-fg" : "text-muted"}`;

  return (
    <form onSubmit={alEnviar} className="space-y-4 rounded-[28px] bg-card p-5">
      <div>
        <h2 className="text-lg font-bold">Pagar para mí y más personas</h2>
        <p className="text-xs text-muted">
          Sube un solo comprobante y marca a quiénes cubre. Se registra en la cuota pendiente de cada uno y un directivo aprueba cada pago.
        </p>
      </div>

      <div className="flex gap-1 rounded-full bg-background p-1">
        <button type="button" onClick={() => setTipo("fondo")} className={pildora(tipo === "fondo")}>
          Pago al fondo
        </button>
        <button type="button" onClick={() => setTipo("cadena")} className={pildora(tipo === "cadena")}>
          Cadena
        </button>
      </div>
      <input type="hidden" name="tipo" value={tipo} />

      <fieldset className="space-y-1">
        <legend className="text-xs text-muted">
          ¿Quiénes están incluidos? ({marcadosValidos.length} marcado{marcadosValidos.length === 1 ? "" : "s"})
        </legend>
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-2xl border border-card-border p-2">
          {aplicables.length === 0 && <p className="p-2 text-xs text-muted">Nadie tiene pendiente esta parte.</p>}
          {aplicables.map((p) => (
            <label key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm">
              <input
                type="checkbox"
                value={p.id}
                checked={p.id === yoId || marcados.includes(p.id)}
                disabled={p.id === yoId}
                onChange={() => alternar(p.id)}
                className="size-4 accent-[var(--accent)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{p.id === yoId ? `${p.nombre} (yo)` : p.nombre}</span>
                <span className="block text-xs text-muted">{p.mes}</span>
              </span>
              <span className="text-xs font-semibold">{pesos(montoDe(p))}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <p className="rounded-2xl bg-background px-4 py-3 text-sm">
        Total que debe sumar tu transferencia: <span className="font-extrabold">{pesos(total)}</span>
        {marcadosValidos.length > 0 && (
          <span className="mt-1 block text-xs text-muted">
            {marcadosValidos.some((p) => p.id === yoId)
              ? `Tu parte (${pesos(montoDe(marcadosValidos.find((p) => p.id === yoId)!))})${marcadosValidos.length > 1 ? ` + ${marcadosValidos.length - 1} persona${marcadosValidos.length === 2 ? "" : "s"} más` : ""}`
              : `${marcadosValidos.length} persona${marcadosValidos.length === 1 ? "" : "s"}`}
          </span>
        )}
      </p>

      <label className="block space-y-1">
        <span className="text-xs text-muted">Nota (opcional)</span>
        <input
          name="descripcion"
          maxLength={120}
          placeholder="Ej: pagué por mis hermanos"
          className="w-full rounded-xl border border-card-border bg-background px-3 py-2.5 text-sm outline-none focus:border-accent"
        />
      </label>

      <SelectorArchivo titulo="Subir comprobante" ayuda="Pantallazo de la transferencia" />

      <button disabled={ocupado} className="w-full rounded-full bg-accent py-3 text-sm font-semibold text-accent-fg disabled:opacity-60">
        {comprimiendo ? "Comprimiendo…" : pendiente ? "Enviando…" : `Enviar comprobante por ${marcadosValidos.length} persona${marcadosValidos.length === 1 ? "" : "s"}`}
      </button>
      {estado.ok && !ocupado && <p className="text-sm text-ok">Enviado. Cada pago queda en revisión.</p>}
      {(errorLocal || estado.error) && !ocupado && <p className="text-sm text-danger">{errorLocal || estado.error}</p>}
      <p className="text-xs text-muted">¿No logras subirlo? Envíaselo a un administrador y él lo carga por ti.</p>
    </form>
  );
}
