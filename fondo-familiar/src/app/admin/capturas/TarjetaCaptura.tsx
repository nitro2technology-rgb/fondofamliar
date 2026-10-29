"use client";

import { startTransition, useActionState, useState, useTransition, type FormEvent } from "react";
import { editarCaptura, eliminarCaptura, type EstadoForm } from "@/lib/acciones";
import { datosConImagenComprimida } from "@/lib/comprimir";
import VisorImagen from "@/components/VisorImagen";

const campo =
  "w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

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
  const ocupado = pendiente || comprimiendo;

  async function alGuardar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (ocupado) return;
    const form = e.currentTarget;
    setComprimiendo(true);
    const datos = await datosConImagenComprimida(form);
    setComprimiendo(false);
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
    <div className="space-y-3 rounded-2xl border border-card-border bg-card p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{c.mes}</p>
          {c.textoNu && <p className="text-xs text-muted">NU: {c.textoNu}</p>}
          {c.textoApp && <p className="text-xs text-muted">App: {c.textoApp}</p>}
          {c.textoDiferencia && (
            <p className={`text-xs font-medium ${c.cuadra ? "text-ok" : "text-danger"}`}>{c.textoDiferencia}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          {c.url && <VisorImagen url={c.url} texto="Ver" />}
          <button type="button" onClick={() => setEditando((v) => !v)} className="text-sm text-accent underline">
            {editando ? "Cancelar" : "Editar"}
          </button>
        </div>
      </div>

      {editando && (
        <form onSubmit={alGuardar} className="space-y-3 border-t border-card-border pt-3">
          <input type="hidden" name="periodo" value={c.periodo} />
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Saldo que muestra la cuenta</span>
            <input name="saldo" inputMode="numeric" defaultValue={c.saldoDeclarado ?? ""} className={campo} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-muted">Cambiar imagen (opcional)</span>
            <input type="file" name="archivo" accept="image/*" className={campo} />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button disabled={ocupado} className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg disabled:opacity-60">
              {comprimiendo ? "Comprimiendo…" : pendiente ? "Guardando…" : "Guardar cambios"}
            </button>
            {confirmar ? (
              <>
                <button
                  type="button"
                  onClick={eliminar}
                  disabled={borrando}
                  className="rounded-xl bg-danger px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {borrando ? "Eliminando…" : "Sí, eliminar"}
                </button>
                <button type="button" onClick={() => setConfirmar(false)} className="text-sm text-muted underline">
                  No
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmar(true)} className="text-sm text-danger underline">
                Eliminar captura
              </button>
            )}
          </div>
          {estado.ok && !ocupado && <p className="text-sm text-ok">Cambios guardados</p>}
          {(estado.error || errorBorrado) && !ocupado && <p className="text-sm text-danger">{estado.error || errorBorrado}</p>}
        </form>
      )}
    </div>
  );
}
