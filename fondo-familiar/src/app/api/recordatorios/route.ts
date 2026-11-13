import { NextResponse } from "next/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { enviarCorreos, plantilla } from "@/lib/correo";
import { fechaCorta, hoyColombia, pesos } from "@/lib/format";
import { carteraVigente } from "@/lib/cartera";
import { enviarPush, enviarPushAdmins } from "@/lib/push";

// Cron diario (7 a. m. Colombia). Avisos por notificación push (y bandeja) y por correo:
//  - Reunión: push todos los días desde una semana antes hasta el día de la reunión; correo solo 7 días y 1 día antes.
//    Si la persona tiene la cuota pendiente, el aviso se lo recuerda. Cuota en mora: cada 7 días (push + correo).
//  - Préstamos: el interés vence cada mes el mismo día del desembolso. Push diario durante la semana previa;
//    correo 7 días antes, 1 día antes y el día del pago; mora cada 7 días.
//  - Multas pendientes: una vez por semana (push + correo) hasta que se paguen.
//  - Dinero disponible para prestar: una notificación diaria a todos si hay caja.
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
  const { data: horas } = await db.from("reuniones").select("fecha, hora");
  const horaDe = (f: string) => (horas ?? []).find((r) => r.fecha === f)?.hora?.slice(0, 5) ?? null;
  const hora12 = (h: string) => {
    const [hh, mm] = h.split(":").map(Number);
    return `${hh % 12 || 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "a. m." : "p. m."}`;
  };

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

  // ───── Reunión: push diario la semana previa; correo a los 7 días y a 1 día ─────
  async function avisarReunion(fecha: string, dias: number) {
    const periodo = `${fecha.slice(0, 7)}-01`;
    const [{ data: perfiles }, { data: pendientes }] = await Promise.all([
      db.from("perfiles").select("id, correo").eq("activo", true),
      db.from("cuotas").select("asociado_id").eq("periodo", periodo).neq("estado", "pagada"),
    ]);
    const debe = new Set((pendientes ?? []).map((c) => c.asociado_id));
    const h = horaDe(fecha);
    const cuando = fechaCorta(fecha);
    const titulo = dias === 0 ? "Hoy es la reunión del fondo" : dias === 1 ? "Mañana es la reunión del fondo" : `La reunión del fondo es en ${dias} días`;
    const base = `Reunión del ${cuando}${h ? ` a las ${hora12(h)}` : ""}.`;
    const conCuota = `${base} Tu cuota aún está pendiente: sube tus comprobantes en la app.`;
    const todos = perfiles ?? [];
    const grupos = [
      { ids: todos.filter((p) => !debe.has(p.id)), texto: base, ruta: "/calendario" },
      { ids: todos.filter((p) => debe.has(p.id)), texto: conCuota, ruta: "/pagos" },
    ];
    let n = 0;
    for (const g of grupos) {
      if (g.ids.length === 0) continue;
      n += await enviarPush(g.ids.map((p) => p.id), { titulo, cuerpo: g.texto, url: g.ruta, tag: "reunion" });
      if (dias === 7 || dias === 1) {
        const r = await enviarCorreos(g.ids.map((p) => p.correo), titulo, plantilla(titulo, [g.texto], { texto: "Abrir la app", ruta: g.ruta }));
        n += r.enviados;
      }
    }
    resumen[`reunion_${fecha}`] = n;
  }

  // ───── Intereses de préstamos (vencen cada mes, el día del desembolso) ─────
  const cartera = (await carteraVigente(hoy)).filter((c) => c.activo && c.cuentas.saldoCapital > 0);
  const hoyVencen: { n: string; t: number }[] = [];
  let avisosPrestamo = 0;
  for (const c of cartera) {
    const { interesPendiente, moraPendiente, interesProximo, proximoPago, ultimoVencimiento } = c.cuentas;
    let tipo: Momento | null = null;
    const faltan = proximoPago ? diasEntre(hoy, proximoPago) : -1;
    if (faltan === 0) tipo = "hoy";
    else if (faltan >= 1 && faltan <= 7) tipo = "antes";
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
      : faltan === 1 ? "Mañana vence el interés de tu préstamo" : `El interés de tu préstamo vence en ${faltan} días (${cuando})`;
    const detalle = `Interés: ${pesos(interes)}${moraPendiente > 0 ? ` · Mora: ${pesos(moraPendiente)}` : ""}.`;
    const lineas = [detalle, `Total a pagar: ${pesos(total)}. Súbelo con su comprobante en la app.`];
    // Correo: 7 días antes, 1 día antes y el día del pago (y la mora semanal); push todos los días de la semana previa.
    if (c.correo && (tipo === "mora" || faltan === 7 || faltan === 1 || faltan === 0)) {
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

  // ───── Multas pendientes: una vez por semana hasta que se paguen ─────
  const { data: multas } = await db
    .from("multas")
    .select("asociado_id, monto, reuniones(fecha), perfiles!multas_asociado_id_fkey(correo, activo)")
    .eq("pagada", false);
  const porPersona = new Map<string, { correo: string | null; total: number; antigua: string }>();
  for (const m of (multas ?? []) as unknown as { asociado_id: string; monto: number; reuniones: { fecha: string } | null; perfiles: { correo: string; activo: boolean } | null }[]) {
    if (!m.perfiles?.activo || !m.reuniones) continue;
    const previo = porPersona.get(m.asociado_id);
    const fecha = m.reuniones.fecha;
    porPersona.set(m.asociado_id, {
      correo: m.perfiles.correo,
      total: (previo?.total ?? 0) + Number(m.monto),
      antigua: previo && previo.antigua < fecha ? previo.antigua : fecha,
    });
  }
  let avisosMultas = 0;
  for (const [id, f] of porPersona) {
    const dias = diasEntre(f.antigua, hoy);
    if (dias < 7 || dias % 7 !== 0) continue;
    const titulo = `Tienes multas pendientes por ${pesos(f.total)}`;
    const cuerpo = "Págalas junto con tu cuota o en efectivo para estar al día: con multas pendientes no puedes solicitar préstamos.";
    const r = await enviarCorreos([f.correo], titulo, plantilla(titulo, [cuerpo], { texto: "Abrir la app", ruta: "/" }));
    avisosMultas += r.enviados + (await enviarPush([id], { titulo, cuerpo, url: "/", tag: "multa" }));
  }
  resumen.multas = avisosMultas;

  // ───── Reuniones: avisos de la semana previa y mora de cuotas ─────
  for (const f of fechas) {
    const dias = diasEntre(hoy, f);
    if (dias >= 0 && dias <= 7) await avisarReunion(f, dias);
    else if (f < hoy) {
      const dias = diasEntre(f, hoy);
      if (dias >= 1 && (dias - 1) % 7 === 0) await avisarCuota(f, "mora");
    }
  }

  // ───── Cierre de ciclo: avisos a todos 30, 7 y 1 día antes de la reunión de liquidación ─────
  const ultima = fechas.length ? fechas.reduce((a, b) => (a > b ? a : b)) : null;
  const { data: cerrado } = await db.from("parametros").select("valor").eq("clave", "ciclo_cerrado").maybeSingle();
  const cicloCerrado = Number(cerrado?.valor ?? 0) === 1;
  if (ultima && [30, 7, 1].includes(diasEntre(hoy, ultima))) {
    const dias = diasEntre(hoy, ultima);
    const cuando = fechaCorta(ultima);
    const titulo = dias === 1 ? "Mañana es la reunión de liquidación" : `Faltan ${dias} días para la liquidación del fondo`;
    const cuerpo = `La reunión de liquidación es el ${cuando}. Los préstamos deben quedar pagos (capital, interés y mora) antes de esa reunión; ese día se devuelven ahorros y utilidades.`;
    const { data: todos } = await db.from("perfiles").select("correo").eq("activo", true);
    const r = await enviarCorreos((todos ?? []).map((t) => t.correo), titulo, plantilla(titulo, [cuerpo], { texto: "Abrir la app", ruta: "/" }));
    resumen.cierre = r.enviados + (await enviarPush(null, { titulo, cuerpo, url: "/", tag: "cierre-ciclo" }));
  }

  // ───── Dinero disponible para prestar: una vez al día, a todos (no si el ciclo está cerrado) ─────
  const { data: caja } = await db.rpc("caja_disponible");
  const disponible = Number(caja ?? 0);
  if (disponible > 0 && !cicloCerrado) {
    resumen.caja = await enviarPush(null, {
      titulo: `Hay ${pesos(disponible)} disponibles para prestar`,
      cuerpo: "Si lo necesitas, solicita tu préstamo desde la app.",
      url: "/prestamos",
      tag: "caja-disponible",
    });
  }

  // Limpieza: los avisos de la bandeja se conservan 60 días.
  await db.from("avisos").delete().lt("creado_en", new Date(Date.now() - 60 * 86_400_000).toISOString());

  return NextResponse.json({ ok: true, hoy, resumen });
}
