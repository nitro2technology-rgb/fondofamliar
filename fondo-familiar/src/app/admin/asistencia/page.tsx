import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { guardarAsistencia, guardarJuegos } from "@/lib/acciones";
import { fechaCorta, hoyColombia, mesLargo, pesos } from "@/lib/format";

export default function Asistencia({ searchParams }: PageProps<"/admin/asistencia">) {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

const ESTADOS = [
  ["puntual", "Puntual"],
  ["tarde", "Tarde"],
  ["ausente", "Ausente"],
  ["justificada", "Justificada"],
] as const;

const campo =
  "w-full rounded-xl border border-card-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";

async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/asistencia">["searchParams"] }) {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();

  const { data: reuniones } = await supabase.from("reuniones").select("id, fecha").order("fecha");
  const lista = reuniones ?? [];
  const pedido = String((await searchParams).reunion ?? "");
  const elegida =
    lista.find((r) => r.fecha.slice(0, 7) === pedido.slice(0, 7)) ??
    [...lista].reverse().find((r) => r.fecha <= hoy) ??
    lista[0];

  if (!elegida) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">
        <p className="text-muted">No hay reuniones creadas.</p>
      </main>
    );
  }

  const periodo = `${elegida.fecha.slice(0, 7)}-01`;
  const [{ data: perfiles }, { data: asistencias }, { data: juegos }, { data: cuotas }] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, ciudad").eq("activo", true).order("nombre"),
    supabase.from("asistencias").select("asociado_id, estado").eq("reunion_id", elegida.id),
    supabase.from("juegos").select("recaudo, premios, utilidad").eq("reunion_id", elegida.id).maybeSingle(),
    supabase.from("cuotas").select("juegos").eq("periodo", periodo).eq("estado", "pagada"),
  ]);
  const sugerido = (cuotas ?? []).reduce((s, c) => s + Number(c.juegos), 0);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-8">
      <Link href="/admin" className="text-sm text-accent underline">
        ← Administración
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Asistencia y juegos</h1>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {lista.map((r) => (
          <Link
            key={r.id}
            href={`/admin/asistencia?reunion=${r.fecha.slice(0, 7)}`}
            className={`shrink-0 rounded-full px-3 py-1 text-xs ${
              r.id === elegida.id ? "bg-accent text-accent-fg" : "border border-card-border text-muted"
            }`}
          >
            {mesLargo(r.fecha).slice(0, 3)} {r.fecha.slice(2, 4)}
          </Link>
        ))}
      </div>
      <p className="text-sm text-muted">Reunión del {fechaCorta(elegida.fecha)}. Retraso y ausencia generan multa automática.</p>

      <form action={guardarAsistencia} className="space-y-2">
        <input type="hidden" name="reunion_id" value={elegida.id} />
        {(perfiles ?? []).map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border border-card-border bg-card p-3">
            <div className="flex-1">
              <p className="text-sm font-medium">{p.nombre}</p>
              {p.ciudad && <p className="text-xs text-muted">{p.ciudad}</p>}
            </div>
            <select
              name={`estado_${p.id}`}
              defaultValue={(asistencias ?? []).find((a) => a.asociado_id === p.id)?.estado ?? ""}
              className="rounded-xl border border-card-border bg-background px-2 py-2 text-sm"
            >
              <option value="">—</option>
              {ESTADOS.map(([valor, texto]) => (
                <option key={valor} value={valor}>
                  {texto}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-accent-fg">Guardar asistencia</button>
      </form>

      <form action={guardarJuegos} className="space-y-3 rounded-2xl border border-card-border bg-card p-4">
        <input type="hidden" name="reunion_id" value={elegida.id} />
        <h2 className="font-semibold">Juegos</h2>
        <p className="text-xs text-muted">
          Recaudo sugerido (partes de juegos de cuotas pagadas): {pesos(sugerido)}. Mitad a premios y mitad a utilidad.
        </p>
        <input name="recaudo" inputMode="numeric" defaultValue={juegos?.recaudo ?? sugerido} className={campo} />
        {juegos && (
          <p className="text-xs text-muted">
            Guardado: premios {pesos(Number(juegos.premios))} · utilidad {pesos(Number(juegos.utilidad))}
          </p>
        )}
        <button className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Guardar juegos</button>
      </form>
    </main>
  );
}
