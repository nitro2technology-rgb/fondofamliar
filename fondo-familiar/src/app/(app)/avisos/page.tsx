import { Suspense } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { requerirPerfil } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import MarcarAvisosLeidos from "@/components/MarcarAvisosLeidos";
import ActivarNotificaciones from "@/components/ActivarNotificaciones";

export default function Avisos() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Contenido />
    </Suspense>
  );
}

const cuando = (iso: string) =>
  new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "America/Bogota" }).format(new Date(iso));

async function Contenido() {
  await requerirPerfil();
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("avisos")
    .select("id, titulo, cuerpo, url, leido, creado_en")
    .order("creado_en", { ascending: false })
    .limit(60);
  const lista = data ?? [];

  return (
    <div className="space-y-5">
      <MarcarAvisosLeidos hayPendientes={lista.some((a) => !a.leido)} />
      <Link href="/" className="text-sm text-accent">
        ← Inicio
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Avisos</h1>
      <ActivarNotificaciones />

      {lista.length === 0 ? (
        <p className="rounded-[28px] bg-card p-6 text-center text-sm text-muted">
          Aún no tienes avisos. Aquí verás lo que pasa con tus cuotas, tu préstamo y el dinero disponible.
        </p>
      ) : (
        <div className="space-y-2">
          {lista.map((a) => {
            const contenido = (
              <div className={`flex gap-3 rounded-[28px] p-4 ${a.leido ? "bg-card" : "bg-accent-soft"}`}>
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-background text-accent">
                  <Bell size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug">{a.titulo}</p>
                  <p className="text-sm text-muted">{a.cuerpo}</p>
                  <p className="mt-1 text-xs text-muted">{cuando(a.creado_en)}</p>
                </div>
              </div>
            );
            return a.url ? (
              <Link key={a.id} href={a.url} className="block">
                {contenido}
              </Link>
            ) : (
              <div key={a.id}>{contenido}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
