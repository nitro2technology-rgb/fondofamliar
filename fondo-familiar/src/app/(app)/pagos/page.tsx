import { Suspense } from "react";
import Link from "next/link";
import { requerirPerfil } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { mesLargo, pesos } from "@/lib/format";
import FormularioPago from "./FormularioPago";

export default function Pagos({ searchParams }: PageProps<"/pagos">) {
  return (
    <Suspense fallback={<p className="text-muted">Cargando…</p>}>
      <Contenido searchParams={searchParams} />
    </Suspense>
  );
}

async function Contenido({ searchParams }: { searchParams: PageProps<"/pagos">["searchParams"] }) {
  const perfil = await requerirPerfil();
  const supabase = await crearClienteServidor();

  const [{ data: cuotas }, { data: turnos }] = await Promise.all([
    supabase
      .from("cuotas")
      .select("id, periodo, ahorro, cadena, juegos")
      .eq("asociado_id", perfil.id)
      .neq("estado", "pagada")
      .order("periodo"),
    supabase.from("cadena_turnos").select("nombre_listado, fecha_reunion"),
  ]);
  const pendientes = cuotas ?? [];
  const pedido = String((await searchParams).periodo ?? "");
  const cuota = pendientes.find((c) => c.periodo.slice(0, 7) === pedido.slice(0, 7)) ?? pendientes[0];

  let reportes: { tipo: string; estado: "pendiente" | "aprobado" | "rechazado"; nota: string | null; url: string | null }[] = [];
  if (cuota) {
    const { data } = await supabase
      .from("pagos_reportados")
      .select("tipo, estado, nota, ruta_archivo")
      .eq("cuota_id", cuota.id);
    reportes = await Promise.all(
      (data ?? []).map(async (r) => {
        const { data: firmada } = await supabase.storage.from("comprobantes-pago").createSignedUrl(r.ruta_archivo, 3600);
        return { tipo: r.tipo, estado: r.estado, nota: r.nota, url: firmada?.signedUrl ?? null };
      }),
    );
  }
  const { data: filaBeneficiario } = cuota
    ? await supabase.rpc("beneficiario_cadena", { p_periodo: cuota.periodo })
    : { data: null };
  const cuentaBeneficiario: string | null = filaBeneficiario?.[0]?.cuenta_pago ?? null;
  const reporteDe = (tipo: string) => reportes.find((r) => r.tipo === tipo) ?? null;
  const beneficiario = cuota
    ? turnos?.find((t) => t.fecha_reunion.slice(0, 7) === cuota.periodo.slice(0, 7))?.nombre_listado
    : null;

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-accent underline">
        ← Inicio
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Registrar pago</h1>

      {!cuota ? (
        <p className="rounded-2xl border border-card-border bg-card p-4 text-muted">No tienes cuotas pendientes. ¡Estás al día!</p>
      ) : (
        <>
          <p className="text-sm text-muted">
            Sube la captura de cada transferencia. Un administrador la revisa y, cuando la apruebe, tu cuota queda pagada.
          </p>

          {pendientes.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {pendientes.map((c) => (
                <Link
                  key={c.id}
                  href={`/pagos?periodo=${c.periodo.slice(0, 7)}`}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs ${
                    c.id === cuota.id ? "bg-accent text-accent-fg" : "border border-card-border text-muted"
                  }`}
                >
                  {mesLargo(c.periodo)}
                </Link>
              ))}
            </div>
          )}

          <p className="font-medium">Cuota de {mesLargo(cuota.periodo)}</p>

          <FormularioPago
            key={`${cuota.id}-fondo`}
            cuotaId={cuota.id}
            tipo="fondo"
            titulo="Pago al fondo"
            detalle="Ahorro + juegos, a la cuenta del fondo."
            monto={pesos(Number(cuota.ahorro) + Number(cuota.juegos))}
            reporte={reporteDe("fondo")}
          />

          {Number(cuota.cadena) > 0 ? (
            <FormularioPago
              key={`${cuota.id}-cadena`}
              cuotaId={cuota.id}
              tipo="cadena"
              titulo="Pago de la cadena"
              detalle={
                (beneficiario ? `Se paga directamente a ${beneficiario}, quien tiene el turno este mes.` : "Se paga a quien tiene el turno este mes.") +
                (cuentaBeneficiario ? ` Cuenta: ${cuentaBeneficiario}` : " Aún no ha registrado su cuenta; consúltala con un administrador.")
              }
              monto={pesos(Number(cuota.cadena))}
              reporte={reporteDe("cadena")}
            />
          ) : (
            <p className="rounded-2xl border border-card-border bg-card p-4 text-sm text-muted">
              Este mes tienes el turno de la cadena: no pagas esa parte.
            </p>
          )}
        </>
      )}
    </div>
  );
}
