import { Suspense } from "react";
import Link from "next/link";
import { Images } from "lucide-react";
import { requerirPerfil } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { fechaCorta, hoyColombia, mesLargo } from "@/lib/format";

export default function Recuerdos() {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  const perfil = await requerirPerfil();
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();

  const [{ data: reuniones }, { data: fotos }] = await Promise.all([
    supabase.from("reuniones").select("id, fecha").lte("fecha", hoy).order("fecha", { ascending: false }),
    supabase.from("recuerdos").select("reunion_id, asociado_id, ruta_mini").order("creado_en", { ascending: false }),
  ]);

  // Portada: la foto más reciente de cada reunión.
  const portadas = new Map<string, string>();
  for (const f of fotos ?? []) if (!portadas.has(f.reunion_id)) portadas.set(f.reunion_id, f.ruta_mini);
  const firmadas = new Map<string, string>();
  if (portadas.size > 0) {
    const { data } = await clienteAdmin().storage.from("recuerdos").createSignedUrls([...portadas.values()], 3600);
    for (const d of data ?? []) if (d.path && d.signedUrl) firmadas.set(d.path, d.signedUrl);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Recuerdos</h1>
        <p className="mt-1 text-sm text-muted">Las fotos de cada reunión. Sube hasta 5 por reunión y mira las de todos.</p>
      </div>

      {(reuniones ?? []).length === 0 && (
        <p className="rounded-[28px] bg-card p-6 text-center text-sm text-muted">
          Aún no ha habido reuniones. Aquí aparecerán los recuerdos desde la primera reunión.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {(reuniones ?? []).map((r) => {
          const deReunion = (fotos ?? []).filter((f) => f.reunion_id === r.id);
          const total = deReunion.length;
          const mias = deReunion.filter((f) => f.asociado_id === perfil.id).length;
          const portada = portadas.get(r.id);
          const url = portada ? firmadas.get(portada) : undefined;
          return (
            <Link key={r.id} href={`/recuerdos/${r.id}`} className="overflow-hidden rounded-[28px] bg-card">
              <div className="aspect-[4/3] bg-accent-soft">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" loading="lazy" className="size-full object-cover" />
                ) : (
                  <div className="grid size-full place-items-center text-accent">
                    <Images size={32} />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold first-letter:uppercase">{mesLargo(r.fecha)}</p>
                <p className="text-xs text-muted">
                  {fechaCorta(r.fecha)} · {total} foto{total === 1 ? "" : "s"}
                  {mias > 0 && ` (${mias} tuya${mias === 1 ? "" : "s"})`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
