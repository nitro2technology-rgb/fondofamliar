import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";

export default function Admin() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <AdminContenido />
    </Suspense>
  );
}

async function AdminContenido() {
  await requerirAdmin();

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 pt-8">
      <h1 className="text-3xl font-bold tracking-tight">Administración</h1>
      <p className="text-muted">Registro y consulta del fondo.</p>
      {[
        ["/admin/pagos", "Pagos reportados (revisar y aprobar)"],
        ["/admin/prestamos", "Préstamos (votación, desembolsos y pagos)"],
        ["/admin/cuotas", "Cuotas mensuales"],
        ["/admin/cadena", "Cadena (entrega del turno)"],
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
