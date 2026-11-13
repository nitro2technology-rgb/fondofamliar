import { NextResponse } from "next/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { enviarCorreos, plantilla } from "@/lib/correo";
import { fechaCorta, hoyColombia, pesos } from "@/lib/format";
import { carteraVigente } from "@/lib/cartera";
import { enviarPush, enviarPushAdmins } from "@/lib/push";

// Cron diario (7 a. m. Colombia). Avisos por correo y notificación push:
//  - Cuotas: 3 días antes de la reunión y el mismo día, a quien no ha pagado; en mora, al día siguiente y luego cada 7 días.
//  - Préstamos: el interés vence cada mes el mismo día del desembolso; mismos avisos (3 días antes, el día, mora semanal).
//  - Dinero disponible para prestar: una notificación diaria a todos si hay caja.
const sumarDias = (iso: string, d: number) => {
  const f = new Date(`${iso}T00:00:00Z`);
  f.setUTCDate(f.getUTCDate() + d);
  return f.toISOString().slice(0, 10);
};
const diasEntre = (desde: string, hasta: string) => (Date.parse(hasta) - Date.parse(desde)) / 86_400_000;

type Momento = "antes" | "hoy" | "mora";

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

  // ───── Cuotas mensuales ─────
  async function avisarCuota(fecha: string, tipo: Momento) {
    const periodo = `${fecha.slice(0, 7)}-01`;
    const { data: cuotas } = await db
      .from("cuotas")
      .select("asociado_id, perfiles!cuotas_asociado_id_fkey(correo, activo)")
      .eq("periodo", periodo)
      .neq("estado", "pagada");
    const filas = ((cuotas ?? []) as unknown as {
      asociado_id: string;
      perfiles: { correo: string; activo: boolean } | null;
    }[]).filter((c) => c.perfiles?.activo);
    const cuando = fechaCorta(fecha);
    const asunto =
      tipo === "mora" ? `Tu cuota del ${cuando} está en mora`
      : tipo === "hoy" ? "Hoy es la reunión: recuerda tu cuota"
      : `Recordatorio: cuota para la reunión del ${cuando}`;
    const lineas =
      tipo === "mora"
        ? [`Tu cuota de la reunión del ${cuando} sigue pendiente.`, "Sube tus comprobantes cuanto antes para ponerte al día."]
        : [`Tu cuota para la reunión del ${cuando} aún no está registrada.`, "Sube el comprobante del pago al fondo y el de la cadena en la app."];
    const r = await enviarCorreos(filas.map((c) => c.perfiles!.correo), asunto, plantilla(asunto, lineas, { texto: "Registrar pago", ruta: "/pagos" }));
    const p = await enviarPush(filas.map((c) => c.asociado_id), { titulo: asunto, cuerpo: lineas[0], url: "/pagos", tag: "cuota" });
    resumen[`cuota_${tipo}_${fecha}`] = r.enviados + p;
  }

  // ───── Intereses de préstamos (vencen cada mes, el día del desembolso) ─────
  const cartera = (await carteraVigente(hoy)).filter((c) => c.activo && c.cuentas.saldoCapital > 0);
  const hoyVencen: { n: string; t: number }[] = [];
  let avisosPrestamo = 0;
  for (const c of cartera) {
    const { interesPendiente, moraPendiente, interesProximo, proximoPago, ultimoVencimiento } = c.cuentas;
    let tipo: Momento | null = null;
    if (proximoPago === sumarDias(hoy, 3)) tipo = "antes";
    else if (proximoPago === hoy) tipo = "hoy";
    else if (interesPendiente + moraPendiente > 0 && ultimoVencimiento) {
      const dias = diasEntre(ultimoVencimiento, hoy);
      if (dias >= 1 && (dias - 1) % 7 === 0) tipo = "mora";
    }
    if (!tipo) continue;

    // Antes del día de pago aún no se causa el interés: se suma el próximo (la primera cuota lleva el 4x1000).
    const interes = tipo === "antes" ? interesPendiente + interesProximo : interesPendiente;
    const total = interes + moraPendiente;
    if (total <= 0) continue;
    const cuando = proximoPago ? fechaCorta(proximoPago) : "";
    const asunto =
      tipo === "mora" ? "Tu préstamo tiene intereses en mora"
      : tipo === "hoy" ? "Hoy vence el interés de tu préstamo"
      : `El interés de tu préstamo vence el ${cuando}`;
    const detalle = `Interés: ${pesos(interes)}${moraPendiente > 0 ? ` · Mora: ${pesos(moraPendiente)}` : ""}.`;
    const lineas = [detalle, `Total a pagar: ${pesos(total)}. Súbelo con su comprobante en la app.`];
    if (c.correo) {
      const r = await enviarCorreos([c.correo], asunto, plantilla(asunto, lineas, { texto: "Pagar mi préstamo", ruta: "/pagos?pago=prestamo" }));
      avisosPrestamo += r.enviados;
    }
    avisosPrestamo += await enviarPush([c.asociadoId], {
      titulo: asunto,
      cuerpo: `${detalle} Total: ${pesos(total)}.`,
      url: "/pagos?pago=prestamo",
      tag: "prestamo-interes",
    });
    if (tipo === "hoy") hoyVencen.push({ n: c.nombre, t: total });
  }
  resumen.prestamos = avisosPrestamo;

  // Resumen para los directivos con lo que vence hoy.
  if (hoyVencen.length > 0) {
    const { data: admins } = await db.from("perfiles").select("correo").in("rol", ["tesorero", "contador", "fiscal"]).eq("activo", true);
    const titulo = `Por cobrar hoy: ${pesos(hoyVencen.reduce((s, f) => s + f.t, 0))} en intereses`;
    await enviarCorreos(
      (admins ?? []).map((a) => a.correo),
      titulo,
      plantilla(titulo, hoyVencen.map((f) => `${f.n}: ${pesos(f.t)}`), { texto: "Ver préstamos", ruta: "/admin/prestamos" }),
    );
    await enviarPushAdmins({ titulo, cuerpo: `Vencen hoy los intereses de ${hoyVencen.length} préstamo(s).`, url: "/admin/prestamos", tag: "cobro-hoy" });
  }

  // ───── Cuotas por reunión ─────
  for (const f of fechas) {
    if (f === sumarDias(hoy, 3)) await avisarCuota(f, "antes");
    else if (f === hoy) await avisarCuota(f, "hoy");
    else if (f < hoy) {
      const dias = diasEntre(f, hoy);
      if (dias >= 1 && (dias - 1) % 7 === 0) await avisarCuota(f, "mora");
    }
  }

  // ───── Dinero disponible para prestar: una vez al día, a todos ─────
  const { data: caja } = await db.rpc("caja_disponible");
  const disponible = Number(caja ?? 0);
  if (disponible > 0) {
    resumen.caja = await enviarPush(null, {
      titulo: `Hay ${pesos(disponible)} disponibles para prestar`,
      cuerpo: "Si lo necesitas, solicita tu préstamo desde la app.",
      url: "/prestamos",
      tag: "caja-disponible",
    });
  }

  return NextResponse.json({ ok: true, hoy, resumen });
}
