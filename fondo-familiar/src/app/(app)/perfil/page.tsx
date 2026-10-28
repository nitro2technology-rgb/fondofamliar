import { Suspense } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { esAdmin, requerirPerfil } from "@/lib/auth";
import { cerrarSesion } from "@/lib/acciones";

const etiquetaRol = {
  asociado: "Asociado",
  tesorero: "Asociado · Tesorero",
  contador: "Asociado · Contador",
  fiscal: "Asociado · Fiscal",
} as const;

export default function Perfil() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <PerfilContenido />
    </Suspense>
  );
}

async function PerfilContenido() {
  const perfil = await requerirPerfil();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Perfil</h1>
      <div className="rounded-2xl border border-card-border bg-card p-4">
        <p className="font-semibold">{perfil.nombre}</p>
        <p className="text-sm text-muted">{perfil.correo}</p>
        <p className="text-sm text-muted">{etiquetaRol[perfil.rol]}</p>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-card-border bg-card p-4">
        <span>Tema claro / oscuro</span>
        <ThemeToggle />
      </div>
      {esAdmin(perfil) && (
        <Link
          href="/elegir-panel"
          className="block rounded-2xl border border-card-border bg-card p-4 text-center font-medium"
        >
          Cambiar de panel
        </Link>
      )}
      <form action={cerrarSesion}>
        <button className="w-full rounded-2xl border border-card-border p-4 font-medium text-danger">
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
