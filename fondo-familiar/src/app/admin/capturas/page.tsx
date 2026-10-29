import { Suspense } from "react";
import Link from "next/link";
import { requerirAdmin } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { hoyColombia, mesLargo, pesos } from "@/lib/format";
import FormularioCaptura from "./FormularioCaptura";
import TarjetaCaptura from "./TarjetaCaptura";

export default function Capturas() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Contenido />
    </Suspense>
  );
}

async function Contenido() {
  await requerirAdmin();
  const supabase = await crearClienteServidor();
  const { data } = await supabase
    .from("capturas_cuenta")
    .select("periodo, ruta_archivo, saldo_declarado")
    .order("periodo", { ascending: false });

  const capturas = await Promise.all(
    (data ?? []).map(async (c) => {
      const { data: firmada } = await supabase.storage.from("capturas-nu").createSignedUrl(c.ruta_archivo, 3600);
      const [a, m] = c.periodo.split("-").map(Number);
      const finDeMes = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
      const { data: calculado } = await supabase.rpc("saldo_calculado", { hasta: finDeMes });
      return { ...c, url: firmada?.signedUrl, calculado: calculado == null ? null : Number(calculado) };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-md flex-1 space-y-4 px-4 py-8">
      <Link href="/admin" className="text-sm text-accent underline">
        ← Administración
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Captura cuenta NU</h1>
      <p className="text-sm text-muted">Una captura por mes (Art. 8). Solo la ven los administradores.</p>
      <FormularioCaptura mesActual={hoyColombia().slice(0, 7)} />
      <div className="space-y-2">
        {capturas.map((c) => {
          const declarado = c.saldo_declarado == null ? null : Number(c.saldo_declarado);
          const comparable = declarado != null && c.calculado != null;
          return (
            <TarjetaCaptura
              key={c.periodo}
              c={{
                periodo: c.periodo,
                mes: mesLargo(c.periodo),
                url: c.url ?? null,
                saldoDeclarado: declarado,
                calculado: c.calculado,
                textoNu: declarado != null ? pesos(declarado) : null,
                textoApp: c.calculado != null ? pesos(c.calculado) : null,
                textoDiferencia: comparable
                  ? declarado === c.calculado
                    ? "Cuadra"
                    : `Diferencia: ${pesos(declarado - c.calculado!)}`
                  : null,
                cuadra: comparable && declarado === c.calculado,
              }}
            />
          );
        })}
      </div>
    </main>
  );
}
