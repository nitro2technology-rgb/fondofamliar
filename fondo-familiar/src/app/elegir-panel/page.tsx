import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ShieldCheck, User } from "lucide-react";
import { esAdmin, requerirPerfil } from "@/lib/auth";

// Los administradores eligen panel tras iniciar sesión; los asociados van directo a "/".
export default function ElegirPanel() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Selector />
    </Suspense>
  );
}

async function Selector() {
  const perfil = await requerirPerfil();
  if (!esAdmin(perfil)) redirect("/");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-4">
      <h1 className="text-3xl font-bold tracking-tight">¿A qué panel quieres entrar?</h1>
      <Link
        href="/"
        className="flex items-center gap-4 rounded-3xl border border-card-border bg-card p-6"
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          <User size={24} />
        </span>
        <span>
          <span className="block font-semibold">Mi cuenta</span>
          <span className="text-sm text-muted">Mis aportes, préstamo y resumen</span>
        </span>
      </Link>
      <Link
        href="/admin"
        className="flex items-center gap-4 rounded-3xl bg-gradient-to-br from-accent to-[#4a1d99] p-6 text-accent-fg"
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-white/15">
          <ShieldCheck size={24} />
        </span>
        <span>
          <span className="block font-semibold">Administración</span>
          <span className="text-sm opacity-80">Registrar movimientos y votar solicitudes</span>
        </span>
      </Link>
    </main>
  );
}
