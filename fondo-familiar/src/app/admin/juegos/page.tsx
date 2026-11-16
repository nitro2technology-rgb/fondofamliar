import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { resumenJuegos } from "@/lib/juegos";
import { fechaCorta, hoyColombia, mesLargo, pesos } from "@/lib/format";
import SelectorMes from "@/components/SelectorMes";
import BingosReunion, { type PremioBingo } from "./BingosReunion";

export default function Juegos({ searchParams }: PageProps<"/admin/juegos">) {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/juegos">["searchParams"] }) {
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
  const [{ data: perfiles }, { data: premiosDb }, { data: cuotas }, { data: paramsJuegos }, totales] = await Promise.all([
    supabase.from("perfiles").select("id, nombre").eq("activo", true).order("nombre"),
    supabase.from("premios_bingo").select("id, monto, ruta_comprobante, ganador_id").eq("reunion_id", elegida.id).order("creado_en"),
    supabase.from("cuotas").select("juegos").eq("periodo", periodo).eq("estado", "pagada"),
    supabase.from("parametros").select("clave, valor").in("clave", ["cuota_juegos", "bingos_por_reunion", "premio_bingo"]),
    resumenJuegos(),
  ]);
  const pj = Object.fromEntries((paramsJuegos ?? []).map((x) => [x.clave, Number(x.valor)]));
  const cuotaJuegos = pj.cuota_juegos ?? 3000;
  const maxBingos = pj.bingos_por_reunion ?? 3;
  const premioBingo = pj.premio_bingo ?? 9500;
  const recaudadoMes = (cuotas ?? []).reduce((s, c) => s + Number(c.juegos), 0);

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
      <Link href="/admin" className="text-sm text-accent underline">
        ← Resumen
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Juegos</h1>

      <section className="space-y-2 rounded-[28px] bg-card p-5">
        <h2 className="font-semibold">Total de juegos en el ciclo</h2>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Dato t="Recaudado" v={pesos(totales.recaudado)} destacado />
          <Dato t="Premios pagados" v={pesos(totales.premios)} />
          <Dato t="Queda en el fondo" v={pesos(totales.utilidad)} />
        </div>
        <p className="text-xs text-muted">Recaudado = parte de juegos de todas las cuotas pagadas hasta hoy. La utilidad se reparte al cierre del ciclo.</p>
      </section>

      <SelectorMes
        base="/admin/juegos?reunion="
        actual={elegida.fecha.slice(0, 7)}
        opciones={lista.map((r) => ({ valor: r.fecha.slice(0, 7), texto: mesLargo(r.fecha) }))}
      />
      <p className="text-sm text-muted">Reunión del {fechaCorta(elegida.fecha)}.</p>

      <section className="space-y-3 rounded-[28px] bg-card p-5">
        <h2 className="font-semibold">Bingos de la reunión</h2>
        <p className="text-xs text-muted">
          De cada cuota se recaudan {pesos(cuotaJuegos)} para juegos. Se juegan {maxBingos} bingos por reunión y a cada ganador se le pagan {pesos(premioBingo)}; lo
          que sobra queda en el fondo.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Dato t="Recaudado (este mes)" v={pesos(recaudadoMes)} />
          <Dato t="Premios (esta reunión)" v={pesos(premiosReunion)} />
          <Dato t="Queda en el fondo" v={pesos(recaudadoMes - premiosReunion)} />
        </div>
        <BingosReunion
          key={elegida.id}
          reunionId={elegida.id}
          personas={(perfiles ?? []).map((x) => ({ id: x.id, nombre: x.nombre }))}
          premios={premios}
          maximo={maxBingos}
          premioDefecto={premioBingo}
        />
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
