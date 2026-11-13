"use client";

import { startTransition, useActionState, useState, useTransition, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { editarCaptura, eliminarCaptura, type EstadoForm } from "@/lib/acciones";
import { datosConImagenComprimida, errorDeArchivo } from "@/lib/comprimir";
import VisorImagen from "@/components/VisorImagen";
import SelectorArchivo from "@/components/SelectorArchivo";

const campo = "w-full rounded-2xl bg-background px-4 py-3 text-sm outline-none ring-1 ring-card-border focus:ring-accent";

export type DatosCaptura = {
  periodo: string;
  mes: string;
  url: string | null;
  saldoDeclarado: number | null;
  calculado: number | null;
  textoNu: string | null;
  textoApp: string | null;
  textoDiferencia: string | null;
  cuadra: boolean;
};

export default function TarjetaCaptura({ c }: { c: DatosCaptura }) {
  const [editando, setEditando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [eliminada, setEliminada] = useState(false);
  const [errorBorrado, setErrorBorrado] = useState("");
  const [borrando, iniciarBorrado] = useTransition();

  const [estado, accion, pendiente] = useActionState<EstadoForm, FormData>(editarCaptura, {});
  const [comprimiendo, setComprimiendo] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const ocupado = pendiente || comprimiendo;

  async function alGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ocupado) return;
    const form = e.currentTarget;
    setComprimiendo(true);
    const datos = await datosConImagenComprimida(form);
    setComprimiendo(false);
    const problema = errorDeArchivo(datos, "archivo", false);
    setErrorLocal(problema ?? "");
    if (problema) return;
    startTransition(() => accion(datos));
  }

  function eliminar() {
    if (borrando) return;
    setErrorBorrado("");
    setEliminada(true); // se oculta de inmediato; si falla, vuelve
    iniciarBorrado(async () => {
      const r = await eliminarCaptura(c.periodo);
      if (r.error) {
        setEliminada(false);
        setErrorBorrado(r.error);
      }
    });
  }

  if (eliminada) return null;

  return (
    <div className="space-y-4 rounded-[28px] bg-card p-4">
      <div className="flex items-center gap-4">
        {c.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.url} alt={`Captura de ${c.mes}`} className="h-24 w-16 shrink-0 rounded-xl object-cover object-top ring-1 ring-card-border" />
        )}
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-bold">{c.mes}</p>
          {c.textoNu && <p className="text-sm text-muted">NU: <span className="font-semibold text-foreground">{c.textoNu}</span></p>}
          {c.textoApp && <p className="text-xs text-muted">App: {c.textoApp}</p>}
          {c.textoDiferencia && (
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.cuadra ? "bg-ok/15 text-ok" : "bg-danger/15 text-danger"}`}>
              {c.textoDiferencia}
            </span>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {c.url && <VisorImagen url={c.url} texto="Ver" />}
            <button
              type="button"
              onClick={() => setEditando((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold ${
                editando ? "bg-accent text-accent-fg" : "bg-background"
              }`}
            >
              <Pencil size={14} />
              {editando ? "Cerrar" : "Editar"}
            </button>
          </div>
        </div>
      </div>

      {editando && (
        <form onSubmit={alGuardar} className="space-y-3 border-t border-card-border/60 pt-4">
          <input type="hidden" name="periodo" value={c.periodo} />
          <label className="block space-y-1.5 text-xs font-medium text-muted">
            Saldo que muestra la cuenta
            <input name="saldo" inputMode="numeric" defaultValue={c.saldoDeclarado ?? ""} className={campo} />
          </label>
          <SelectorArchivo titulo="Cambiar la imagen (opcional)" ayuda="Si no eliges una, se conserva la actual" />
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={ocupado} className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-60">
              {comprimiendo ? "Comprimiendo…" : pendiente ? "Guardando…" : "Guardar cambios"}
            </button>
            {confirmar ? (
              <>
                <button
                  type="button"
                  onClick={eliminar}
                  disabled={borrando}
                  className="rounded-full bg-danger px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {borrando ? "Eliminando…" : "Sí, eliminar"}
                </button>
                <button type="button" onClick={() => setConfirmar(false)} className="rounded-full bg-background px-4 py-2.5 text-sm font-semibold">
                  No
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmar(true)} className="rounded-full bg-danger/10 px-4 py-2.5 text-sm font-semibold text-danger">
                Eliminar captura
              </button>
            )}
          </div>
          {estado.ok && !ocupado && <p className="text-sm text-ok">Cambios guardados ✓</p>}
          {(errorLocal || estado.error || errorBorrado) && !ocupado && (
            <p className="text-sm text-danger">{errorLocal || estado.error || errorBorrado}</p>
          )}
        </form>
      )}
    </div>
  );
}
