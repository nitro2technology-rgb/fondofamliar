import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import FilaAsociado from "./FilaAsociado";

export default function Asociados() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, rol, celular, ciudad, primer_ingreso_completo")
    .order("nombre");

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-8">
      <Link href="/admin" className="text-sm text-accent underline">
        ← Administración
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Asociados</h1>
      <p className="text-sm text-muted">Edita el celular y la ciudad de cada asociado.</p>
      <datalist id="ciudades">
        {["Pasto", "Bogotá", "Villavicencio", "Otro"].map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <div className="space-y-3">
        {(data ?? []).map((p) => (
          <FilaAsociado key={p.id} asociado={p} />
        ))}
      </div>
    </main>
  );
}
