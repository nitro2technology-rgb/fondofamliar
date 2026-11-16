import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { marcarMultaPagada } from "@/lib/acciones";
import { resumenJuegos } from "@/lib/juegos";
import BingosReunion, { type PremioBingo } from "./BingosReunion";
import { fechaCorta, hoyColombia, mesLargo, pesos } from "@/lib/format";
import BotonEnvio from "@/components/BotonEnvio";
import FormularioAsistencia from "./FormularioAsistencia";
import { fotosPerfil } from "@/lib/fotos-servidor";
import SelectorMes from "@/components/SelectorMes";
import AvatarSocio from "@/components/AvatarSocio";

export default function Asistencia({ searchParams }: PageProps<"/admin/asistencia">) {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}


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
  const [{ data: perfiles }, { data: asistencias }, { data: premiosDb }, { data: cuotas }, { data: multas }, { data: params }, { data: paramsJuegos }, totales] = await Promise.all([
    supabase.from("perfiles").select("id, nombre, ciudad").eq("activo", true).order("nombre"),
    supabase.from("asistencias").select("asociado_id, estado").eq("reunion_id", elegida.id),
    supabase.from("premios_bingo").select("id, monto, ruta_comprobante, ganador_id").eq("reunion_id", elegida.id).order("creado_en"),
    supabase.from("cuotas").select("juegos").eq("periodo", periodo).eq("estado", "pagada"),
    supabase
      .from("multas")
      .select("id, motivo, monto, pagada, perfiles!multas_asociado_id_fkey(nombre)")
      .eq("reunion_id", elegida.id)
      .order("pagada"),
    supabase.from("parametros").select("clave, valor").in("clave", ["multa_tarde", "multa_ausencia"]),
    supabase.from("parametros").select("clave, valor").in("clave", ["cuota_juegos", "bingos_por_reunion", "premio_bingo"]),
    resumenJuegos(),
  ]);
  const p = Object.fromEntries((params ?? []).map((x) => [x.clave, Number(x.valor)]));
  const pj = Object.fromEntries((paramsJuegos ?? []).map((x) => [x.clave, Number(x.valor)]));
  const cuotaJuegos = pj.cuota_juegos ?? 3000;
  const maxBingos = pj.bingos_por_reunion ?? 3;
  const premioBingo = pj.premio_bingo ?? 9500;
  const sugerido = (cuotas ?? []).reduce((s, c) => s + Number(c.juegos), 0);

  const rutas = (premiosDb ?? []).map((x) => x.ruta_comprobante).filter(Boolean) as string[];
  const { data: firmadas } = rutas.length ? await supabase.storage.from("comprobantes-pago").createSignedUrls(rutas, 3600) : { data: [] };
  const premios: PremioBingo[] = (premiosDb ?? []).map((x) => ({
    id: x.id,
    ganador: (perfiles ?? []).find((q) => q.id === x.ganador_id)?.nombre ?? "—",
    monto: Number(x.monto),
    url: firmadas?.find((f) => f.path === x.ruta_comprobante)?.signedUrl ?? null,
  }));
  const premiosReunion = premios.reduce((s, x) => s + x.monto, 0);

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-8">
      <Link href="/admin/mas" className="text-sm text-accent underline">
        ← Resumen
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Asistencia y juegos</h1>

      <SelectorMes
        base="/admin/asistencia?reunion="
        actual={elegida.fecha.slice(0, 7)}
        opciones={lista.map((r) => ({ valor: r.fecha.slice(0, 7), texto: mesLargo(r.fecha) }))}
      />
      <p className="text-sm text-muted">Reunión del {fechaCorta(elegida.fecha)}. Retraso y ausencia generan multa automática.</p>

      <FormularioAsistencia
        fotos={Object.fromEntries(await fotosPerfil((perfiles ?? []).map((x) => x.id)))}
        key={elegida.id}
        reunionId={elegida.id}
        personas={perfiles ?? []}
        guardados={Object.fromEntries((asistencias ?? []).map((a) => [a.asociado_id, a.estado]))}
        multaTarde={p.multa_tarde ?? 5000}
        multaAusencia={p.multa_ausencia ?? 8000}
      />

      {(multas ?? []).length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-lg font-semibold">Multas de esta reunión</h2>
          <div className="divide-y divide-card-border/60 rounded-[28px] bg-card px-2">
            {(multas ?? []).map((m) => {
              const nombre = (m.perfiles as unknown as { nombre: string } | null)?.nombre ?? "";
              return (
                <div key={m.id} className="flex items-center gap-3 px-2 py-3">
                  <AvatarSocio nombre={nombre} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{nombre}</p>
                    <p className="text-xs text-muted">{m.motivo} · {pesos(Number(m.monto))}</p>
                  </div>
                  <form action={marcarMultaPagada}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="pagada" value={m.pagada ? "no" : "si"} />
                    <BotonEnvio
                      enviando="…"
                      className={`rounded-full px-4 py-2 text-xs font-semibold ${m.pagada ? "bg-ok/15 text-ok" : "bg-accent text-accent-fg"}`}
                    >
                      {m.pagada ? "Cobrada ✓" : "Cobrar"}
                    </BotonEnvio>
                  </form>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-[28px] bg-card p-5">
        <h2 className="font-semibold">Bingos</h2>
        <p className="text-xs text-muted">
          De cada cuota se recaudan {pesos(cuotaJuegos)} para juegos. Se juegan {maxBingos} bingos por reunión y a cada ganador se le pagan {pesos(premioBingo)}; lo
          que sobra queda en el fondo.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Dato t="Recaudado (este mes)" v={pesos(sugerido)} />
          <Dato t="Premios (esta reunión)" v={pesos(premiosReunion)} />
          <Dato t="Queda en el fondo" v={pesos(sugerido - premiosReunion)} />
        </div>
        <BingosReunion
          reunionId={elegida.id}
          personas={(perfiles ?? []).map((x) => ({ id: x.id, nombre: x.nombre }))}
          premios={premios}
          maximo={maxBingos}
          premioDefecto={premioBingo}
        />
      </section>

      <section className="space-y-2 rounded-[28px] bg-card p-5">
        <h2 className="font-semibold">Total de juegos en el ciclo</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Dato t="Recaudado" v={pesos(totales.recaudado)} destacado />
          <Dato t="Premios pagados" v={pesos(totales.premios)} />
          <Dato t="Queda en el fondo" v={pesos(totales.utilidad)} />
        </div>
        <p className="text-xs text-muted">Recaudado = parte de juegos de todas las cuotas pagadas hasta hoy. La utilidad se reparte al cierre del ciclo.</p>
      </section>
    </main>
  );
}

function Dato({ t, v, destacado }: { t: string; v: string; destacado?: boolean }) {
  return (
    <div className={`rounded-2xl px-2 py-3 ${destacado ? "bg-accent text-accent-fg" : "bg-background"}`}>
      <p className="text-base font-bold">{v}</p>
      <p className={`mt-0.5 text-[11px] leading-tight ${destacado ? "opacity-80" : "text-muted"}`}>{t}</p>
    </div>
  );
}
