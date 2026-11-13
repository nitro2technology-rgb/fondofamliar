import { fotosPerfil } from "@/lib/fotos-servidor";
import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import FilaAsociado from "./FilaAsociado";

export default function Asociados() {
  return (
    <Suspense fallback={<main className="flex-1 px-4 pt-6 text-muted">Cargando…</main>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, celular, ciudad, cuenta_pago, primer_ingreso_completo")
    .order("nombre");
  const lista = data ?? [];
  const fotos = await fotosPerfil(lista.map((p) => p.id));
  const activos = lista.filter((p) => p.primer_ingreso_completo).length;
  const pct = lista.length ? Math.round((activos / lista.length) * 100) : 0;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6">
      <Link href="/admin/mas" className="text-sm text-accent">
        ← Más
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Asociados</h1>

      <section className="rounded-[28px] bg-card p-5">
        <p className="text-4xl font-extrabold tracking-tight">
          {activos}/{lista.length} <span className="text-base font-medium text-muted">con cuenta activa</span>
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-card-border">
          <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-xs text-muted">
          Toca un asociado para editar su celular, ciudad y cuenta de pagos.
        </p>
      </section>

      <datalist id="ciudades">
        {["Pasto", "Bogotá", "Villavicencio", "Otro"].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="space-y-3">
        {lista.map((p) => (
          <FilaAsociado key={p.id} asociado={p} foto={fotos.get(p.id) ?? null} />
        ))}
      </div>
    </main>
  );
}
