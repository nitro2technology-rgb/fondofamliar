import { Suspense } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import AvatarSocio from "@/components/AvatarSocio";
import BotonEnvio from "@/components/BotonEnvio";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { deshacerAporte, registrarAporte } from "@/lib/acciones";
import { fechaCorta, pesos } from "@/lib/format";

export default function Aportes() {
  return (
    <Suspense fallback={<main className="flex-1 px-4 pt-6 text-muted">Cargando…</main>}>
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
  const lista = perfiles.data ?? [];
  const todos = aportes.data ?? [];

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6">
      <Link href="/admin/mas" className="text-sm text-accent">
        ← Más
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Aportes únicos</h1>

      <section className="rounded-[28px] bg-card p-5">
        <div className="grid grid-cols-2 gap-2 text-center">
          {TIPOS.map(({ tipo, titulo }) => {
            const hechos = todos.filter((a) => a.tipo === tipo);
            return (
              <div key={tipo} className="rounded-2xl bg-background px-2 py-3">
                <p className="text-2xl font-extrabold">
                  {hechos.length}/{lista.length}
                </p>
                <p className="text-[11px] text-muted">{titulo}</p>
                <p className="mt-1 text-xs font-medium">{pesos(hechos.reduce((s, a) => s + Number(a.monto), 0))}</p>
              </div>
            );
          })}
        </div>
      </section>

      <div className="space-y-3">
        {lista.map((p) => (
          <section key={p.id} className="space-y-3 rounded-[28px] bg-card p-4">
            <Link href={`/admin/socio/${p.id}`} className="flex items-center gap-3">
              <AvatarSocio nombre={p.nombre} size={40} />
              <p className="font-semibold">{p.nombre}</p>
            </Link>
            <div className="divide-y divide-card-border/60">
              {TIPOS.map(({ tipo, titulo }) => {
                const a = todos.find((x) => x.asociado_id === p.id && x.tipo === tipo);
                return (
                  <div key={tipo} className="flex items-center gap-3 py-2.5">
                    <div className="flex-1 text-sm">
                      <p>{titulo}</p>
                      <p className="flex items-center gap-1 text-xs text-muted">
                        {a ? (
                          <>
                            <Check size={12} className="text-accent" />
                            {pesos(Number(a.monto))} · {fechaCorta(a.fecha_pago)}
                          </>
                        ) : (
                          "Pendiente"
                        )}
                      </p>
                    </div>
                    {a ? (
                      <form action={deshacerAporte}>
                        <input type="hidden" name="id" value={a.id} />
                        <BotonEnvio className="rounded-full bg-background px-4 py-2 text-xs font-semibold text-muted">
                          Deshacer
                        </BotonEnvio>
                      </form>
                    ) : (
                      <form action={registrarAporte}>
                        <input type="hidden" name="asociado_id" value={p.id} />
                        <input type="hidden" name="tipo" value={tipo} />
                        <BotonEnvio className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-accent-fg">
                          Registrar
                        </BotonEnvio>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
