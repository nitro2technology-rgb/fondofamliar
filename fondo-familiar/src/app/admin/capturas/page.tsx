import { Suspense } from "react";
import Link from "next/link";

import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { fechaCorta, hoyColombia, mesLargo, pesos } from "@/lib/format";
import { mesesDeCaptura } from "@/lib/capturas";
import SelectorMes from "@/components/SelectorMes";
import FormularioCaptura from "./FormularioCaptura";
import TarjetaCaptura from "./TarjetaCaptura";

export default function Capturas({ searchParams }: PageProps<"/admin/capturas">) {
  return (
    <Suspense fallback={<main className="flex-1 px-4 pt-6 text-muted">Cargando…</main>}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/admin/capturas">["searchParams"] }) {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const hoy = hoyColombia();
  const { data: turnos } = await supabase.from("cadena_turnos").select("fecha_reunion, turno");
  const opcionesMes = mesesDeCaptura(turnos ?? []);
  const meses = opcionesMes.map((m) => m.mes);
  const reunionDe = new Map(opcionesMes.map((m) => [m.mes, m.reunion]));
  const rondaDe = new Map(opcionesMes.map((m) => [m.mes, m.ronda]));
  const etiqueta = (m: string) =>
    reunionDe.get(m)
      ? `Ronda ${rondaDe.get(m)} · ${mesLargo(`${m}-01`)} · reunión ${fechaCorta(reunionDe.get(m)!)}`
      : `${mesLargo(`${m}-01`)} · cierre`;

  const { data } = await supabase.from("capturas_cuenta").select("periodo, ruta_archivo, saldo_declarado");
  const porMes = new Map((data ?? []).map((c) => [c.periodo.slice(0, 7), c]));
  const pedido = String((await searchParams).mes ?? "");

  const filas = await Promise.all(
    meses.map(async (mes) => {
      const c = porMes.get(mes);
      if (!c) return { mes, captura: null };
      const { data: firmada } = await supabase.storage.from("capturas-nu").createSignedUrl(c.ruta_archivo, 3600);
      const [a, m] = mes.split("-").map(Number);
      const finDeMes = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
      const corte = reunionDe.get(mes) && reunionDe.get(mes)! < finDeMes ? reunionDe.get(mes)! : finDeMes;
      const futuro = corte > hoy;
      const { data: calculado } = futuro ? { data: null } : await supabase.rpc("saldo_calculado", { hasta: corte });
      return { mes, captura: { ...c, url: firmada?.signedUrl ?? null, calculado: calculado == null ? null : Number(calculado) } };
    }),
  );

  const primerSinSubir = meses.find((m) => !porMes.has(m) && (reunionDe.get(m) ?? "") <= hoy) ?? meses.find((m) => !porMes.has(m));
  const mesInicial = meses.includes(pedido) ? pedido : (primerSinSubir ?? meses[0]);
  const subidas = filas.filter((f) => f.captura).length;

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-5 px-4 py-6">
      <Link href="/admin" className="text-sm text-accent">
        ← Resumen
      </Link>
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Captura NU</h1>
        <p className="mt-1 text-sm text-muted">Una captura por mes (Art. 8). Solo la ven los administradores.</p>
      </div>

      <FormularioCaptura
        key={mesInicial}
        mesInicial={mesInicial}
        opciones={meses.map((m) => ({ valor: m, texto: etiqueta(m), subida: porMes.has(m) }))}
      />

      <section className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <h2 className="text-lg font-semibold">Historial</h2>
          <span className="text-xs text-muted">
            {subidas} de {meses.length} meses
          </span>
        </div>
        <SelectorMes
          base="/admin/capturas?mes="
          actual={mesInicial}
          opciones={meses.map((m) => ({ valor: m, texto: `${etiqueta(m)}${porMes.has(m) ? " ✓" : " · sin captura"}` }))}
        />
        {filas
          .filter((f) => f.mes === mesInicial)
          .map(({ mes, captura: c }) => {
            if (!c) {
              return (
                <p key={mes} className="rounded-[28px] border-2 border-dashed border-card-border px-5 py-6 text-center text-sm text-muted">
                  {mesLargo(`${mes}-01`)} aún no tiene captura. Súbela arriba.
                </p>
              );
            }
            const declarado = c.saldo_declarado == null ? null : Number(c.saldo_declarado);
            const comparable = declarado != null && c.calculado != null;
            return (
              <TarjetaCaptura
                key={`${mes}-${c.ruta_archivo}`}
                c={{
                  periodo: c.periodo,
                  mes: etiqueta(mes),
                  url: c.url,
                  saldoDeclarado: declarado,
                  calculado: c.calculado,
                  textoNu: declarado != null ? pesos(declarado) : null,
                  textoApp: c.calculado != null ? pesos(c.calculado) : null,
                  textoDiferencia: comparable ? (declarado === c.calculado ? "Cuadra" : `Diferencia: ${pesos(declarado - c.calculado!)}`) : null,
                  cuadra: comparable && declarado === c.calculado,
                }}
              />
            );
          })}
        <div className="flex flex-wrap gap-2 pt-1">
          {meses.map((m) => (
            <Link
              key={m}
              href={`/admin/capturas?mes=${m}`}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                m === mesInicial ? "bg-accent text-accent-fg" : porMes.has(m) ? "bg-accent-soft text-accent" : "border border-dashed border-card-border text-muted"
              }`}
            >
              {mesLargo(`${m}-01`).slice(0, 3)} {m.slice(2, 4)}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
