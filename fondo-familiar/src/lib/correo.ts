import "server-only";

// Correos con Resend (API HTTP, sin dependencias). Si falta RESEND_API_KEY no hace nada.
// Se omiten los correos provisionales (socioN@fondofamiliar...) de quien aún no activa su cuenta.
const provisional = /^socio\d+@fondofamiliar\.nitro2tech\.com$/i;

export const correoReal = (correo: string | null | undefined): correo is string =>
  !!correo && !provisional.test(correo);

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export function plantilla(titulo: string, lineas: string[], boton?: { texto: string; ruta: string }) {
  const base = process.env.APP_URL ?? "https://fondofamiliar.nitro2tech.com";
  return `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:16px">
<h2 style="color:#0b7a57;margin:0 0 12px">${esc(titulo)}</h2>
${lineas.map((l) => `<p style="margin:8px 0;color:#222">${esc(l)}</p>`).join("")}
${boton ? `<p style="margin:20px 0"><a href="${base}${boton.ruta}" style="background:#0b7a57;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none">${esc(boton.texto)}</a></p>` : ""}
<p style="color:#888;font-size:12px">Fondo de Ahorro Familiar</p></div>`;
}

// Correo de bienvenida al completar la cuenta: logo del fondo arriba y los primeros pasos.
export function plantillaBienvenida(nombre: string) {
  const base = process.env.APP_URL ?? "https://fondofamiliar.nitro2tech.com";
  const primero = esc(nombre.split(" ")[0] || "");
  const punto = (t: string) => `<li style="margin:6px 0;color:#222">${t}</li>`;
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid #e5e5e5">
<img src="${base}/logo/logo-correo.png" width="520" alt="Fondo Familiar" style="display:block;width:100%;height:auto;border:0">
<div style="padding:24px">
<h2 style="color:#0b7a57;margin:0 0 12px">¡Bienvenido${primero ? `, ${primero}` : ""}!</h2>
<p style="margin:8px 0;color:#222">Tu cuenta del Fondo Familiar quedó lista. Desde la app puedes:</p>
<ul style="padding-left:20px;margin:8px 0">
${punto("Ver tu ahorro y el estado de tus cuotas.")}
${punto("Pagar y subir tus comprobantes.")}
${punto("Solicitar un préstamo cuando haya dinero disponible.")}
${punto("Ver el calendario de reuniones y las fotos de cada una (Recuerdos).")}
</ul>
<p style="margin:12px 0;color:#222"><b>Dos recomendaciones:</b> instálala en la pantalla de inicio de tu celular y activa las notificaciones, así te avisamos cuándo te toca pagar y cuándo hay dinero disponible.</p>
<p style="margin:22px 0"><a href="${base}" style="background:#0b7a57;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:bold">Abrir el Fondo Familiar</a></p>
<p style="color:#888;font-size:12px;margin:0">Por seguridad, no te enviamos tu contraseña. Si no fuiste tú quien creó esta cuenta, avísale a un directivo.</p>
</div></div>`;
}

// Un correo individual por destinatario (no se exponen las direcciones entre asociados).
export async function enviarCorreos(destinos: (string | null | undefined)[], asunto: string, html: string) {
  const clave = process.env.RESEND_API_KEY;
  const lista = [...new Set(destinos.filter(correoReal))];
  if (!clave || lista.length === 0) return { enviados: 0, fallidos: 0 };
  const from = process.env.CORREO_REMITENTE ?? "Fondo Familiar <fondo@nitro2tech.com>";

  const res = await fetch("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
    body: JSON.stringify(lista.map((to) => ({ from, to: [to], subject: asunto, html }))),
  });
  if (!res.ok) {
    console.error("Resend falló", res.status, await res.text().catch(() => ""));
    return { enviados: 0, fallidos: lista.length };
  }
  return { enviados: lista.length, fallidos: 0 };
}
