import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";

export default function Admin() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <AdminContenido />
    </Suspense>
  );
}

async function AdminContenido() {
  await requerirAdmin();
  const { count } = await (await crearClienteServidor())
    .from("pagos_reportados")
    .select("id", { count: "exact", head: true })
    .eq("estado", "pendiente");
  const porRevisar = count ?? 0;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pt-8">
      <h1 className="text-3xl font-bold tracking-tight">Administración</h1>
      <p className="text-muted">Registro y consulta del fondo.</p>
      <Link
        href="/admin/pagos"
        className="flex items-center justify-between rounded-2xl bg-accent px-5 py-4 text-accent-fg shadow-lg"
      >
        <span>
          <span className="block text-lg font-bold">Pagos del mes</span>
          <span className="block text-xs opacity-80">Comprobantes, quién falta y aprobaciones</span>
        </span>
        {porRevisar > 0 && (
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-accent">{porRevisar} por revisar</span>
        )}
      </Link>
      {[
        ["/admin/prestamos", "Préstamos (votación, desembolsos y pagos)"],
        ["/admin/cuotas", "Cuotas mensuales"],
        ["/admin/asistencia", "Asistencia y juegos"],
        ["/admin/multas", "Multas"],
        ["/admin/aportes", "Aportes únicos (inicial y tecnológico)"],
        ["/admin/capturas", "Captura cuenta NU"],
        ["/admin/asociados", "Asociados (celular y ciudad)"],
      ].map(([href, texto]) => (
        <Link key={href} href={href} className="block rounded-2xl border border-card-border bg-card p-4 font-medium">
          {texto}
        </Link>
      ))}
      <a href="/admin/exportar" className="block rounded-2xl border border-card-border bg-card p-4 font-medium">
        Descargar cuotas (Excel)
      </a>
      <Link href="/elegir-panel" className="inline-block text-accent underline">
        Cambiar de panel
      </Link>
    </main>
  );
}
