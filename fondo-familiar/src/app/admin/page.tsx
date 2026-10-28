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
      <p className="text-muted">
        Aquí irán el registro de aportes y pagos, la votación de préstamos, la asistencia y los reportes.
      </p>
      <Link href="/elegir-panel" className="inline-block text-accent underline">
        Cambiar de panel
      </Link>
    </main>
  );
}
