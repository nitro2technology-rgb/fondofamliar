import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { deshacerAporte, registrarAporte } from "@/lib/acciones";
import { fechaCorta, pesos } from "@/lib/format";

export default function Aportes() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Contenido />
    </Suspense>
  );
}

const TIPOS = [
  { tipo: "inicial", titulo: "Aporte inicial" },
  { tipo: "tecnologico", titulo: "Aporte tecnológico" },
] as const;

async function Contenido() {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const [perfiles, aportes] = await Promise.all([
    supabase.from("perfiles").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("aportes_unicos").select("id, asociado_id, tipo, monto, fecha_pago"),
  ]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-8">
      <Link href="/admin" className="text-sm text-accent underline">
        ← Administración
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Aportes únicos</h1>
      <p className="text-sm text-muted">Aporte inicial y aporte tecnológico de cada asociado.</p>
      <div className="space-y-3">
        {(perfiles.data ?? []).map((p) => (
          <div key={p.id} className="space-y-2 rounded-2xl border border-card-border bg-card p-4">
            <p className="font-semibold">{p.nombre}</p>
            {TIPOS.map(({ tipo, titulo }) => {
              const a = (aportes.data ?? []).find((x) => x.asociado_id === p.id && x.tipo === tipo);
              return (
                <div key={tipo} className="flex items-center gap-3">
                  <div className="flex-1 text-sm">
                    <p>{titulo}</p>
                    <p className="text-xs text-muted">
                      {a ? `${pesos(Number(a.monto))} · ${fechaCorta(a.fecha_pago)}` : "Pendiente"}
                    </p>
                  </div>
                  {a ? (
                    <form action={deshacerAporte}>
                      <input type="hidden" name="id" value={a.id} />
                      <button className="rounded-xl border border-card-border px-3 py-2 text-xs text-muted">Deshacer</button>
                    </form>
                  ) : (
                    <form action={registrarAporte}>
                      <input type="hidden" name="asociado_id" value={p.id} />
                      <input type="hidden" name="tipo" value={tipo} />
                      <button className="rounded-xl bg-accent px-3 py-2 text-xs font-medium text-accent-fg">
                        Registrar pago
                      </button>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </main>
  );
}
