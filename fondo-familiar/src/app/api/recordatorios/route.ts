import { NextResponse } from "next/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { enviarCorreos, plantilla } from "@/lib/correo";
import { fechaCorta, hoyColombia } from "@/lib/format";

// Cron diario (7 a. m. Colombia). Recordatorios de cuota:
//  - 3 días antes de la reunión y el mismo día, a quien no ha pagado;
//  - en mora: al día siguiente y luego cada 7 días.
const sumarDias = (iso: string, d: number) => {
  const f = new Date(`${iso}T00:00:00Z`);
  f.setUTCDate(f.getUTCDate() + d);
  return f.toISOString().slice(0, 10);
};

export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const db = clienteAdmin();
  const hoy = hoyColombia();
  const { data: turnos, error } = await db.from("cadena_turnos").select("fecha_reunion");
  if (error) return NextResponse.json({ ok: false }, { status: 500 });

  const fechas = (turnos ?? []).map((t) => t.fecha_reunion);
  const resumen: Record<string, number> = {};

  async function avisar(fecha: string, tipo: "antes" | "hoy" | "mora") {
    const periodo = `${fecha.slice(0, 7)}-01`;
    const { data: cuotas } = await db
      .from("cuotas")
      .select("perfiles!cuotas_asociado_id_fkey(correo, activo)")
      .eq("periodo", periodo)
      .neq("estado", "pagada");
    const filas = (cuotas ?? []) as unknown as {
      perfiles: { correo: string; activo: boolean } | null;
    }[];
    const destinos = filas.filter((c) => c.perfiles?.activo).map((c) => c.perfiles!.correo);
    const cuando = fechaCorta(fecha);
    const asunto =
      tipo === "mora" ? `Tu cuota del ${cuando} está en mora`
      : tipo === "hoy" ? "Hoy es la reunión: recuerda tu cuota"
      : `Recordatorio: cuota para la reunión del ${cuando}`;
    const lineas =
      tipo === "mora"
        ? [`Tu cuota de la reunión del ${cuando} sigue pendiente.`, "Sube tus comprobantes cuanto antes para ponerte al día."]
        : [`Tu cuota para la reunión del ${cuando} aún no está registrada.`, "Sube el comprobante del pago al fondo y el de la cadena en la app."];
    const r = await enviarCorreos(destinos, asunto, plantilla(asunto, lineas, { texto: "Registrar pago", ruta: "/pagos" }));
    resumen[`${tipo}_${fecha}`] = r.enviados;
  }

  for (const f of fechas) {
    if (f === sumarDias(hoy, 3)) await avisar(f, "antes");
    else if (f === hoy) await avisar(f, "hoy");
    else if (f < hoy) {
      const dias = (Date.parse(hoy) - Date.parse(f)) / 86_400_000;
      if (dias >= 1 && (dias - 1) % 7 === 0) await avisar(f, "mora");
    }
  }
  return NextResponse.json({ ok: true, hoy, resumen });
}
