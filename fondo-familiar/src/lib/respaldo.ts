import "server-only";
import { gzipSync } from "node:zlib";
import { clienteAdmin } from "@/lib/supabase/admin";
import { hoyColombia } from "@/lib/format";

// Tablas que se respaldan y la columna por la que se ordenan para paginar sin repetir filas.
const TABLAS: { tabla: string; orden: string }[] = [
  { tabla: "perfiles", orden: "id" },
  { tabla: "parametros", orden: "clave" },
  { tabla: "cadena_turnos", orden: "turno" },
  { tabla: "cuotas", orden: "id" },
  { tabla: "aportes_unicos", orden: "id" },
  { tabla: "externos", orden: "id" },
  { tabla: "prestamos", orden: "id" },
  { tabla: "votos_prestamo", orden: "prestamo_id" },
  { tabla: "movimientos_prestamo", orden: "id" },
  { tabla: "pagos_prestamo", orden: "id" },
  { tabla: "pagos_reportados", orden: "id" },
  { tabla: "reuniones", orden: "id" },
  { tabla: "asistencias", orden: "reunion_id" },
  { tabla: "multas", orden: "id" },
  { tabla: "juegos", orden: "reunion_id" },
  { tabla: "capturas_cuenta", orden: "id" },
  { tabla: "recuerdos", orden: "id" },
  { tabla: "auditoria", orden: "id" },
];

const PAGINA = 1000;

// Lee todas las filas de una tabla en páginas de 1000. Si falla (p. ej. no existe), la omite y lo anota.
async function leerTabla(tabla: string, orden: string): Promise<{ filas: unknown[]; error?: string }> {
  const db = clienteAdmin();
  const filas: unknown[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await db.from(tabla).select("*").order(orden).range(desde, desde + PAGINA - 1);
    if (error) return { filas, error: error.message };
    filas.push(...(data ?? []));
    if (!data || data.length < PAGINA) break;
  }
  return { filas };
}

export type Respaldo = {
  nombre: string;
  contenido: Buffer;
  resumen: Record<string, number>;
  omitidas: Record<string, string>;
};

// Genera el respaldo completo: un JSON con todas las tablas, comprimido con gzip.
export async function generarRespaldo(): Promise<Respaldo> {
  const resumen: Record<string, number> = {};
  const omitidas: Record<string, string> = {};
  const tablas: Record<string, unknown[]> = {};
  for (const { tabla, orden } of TABLAS) {
    const r = await leerTabla(tabla, orden);
    if (r.error) omitidas[tabla] = r.error;
    tablas[tabla] = r.filas;
    resumen[tabla] = r.filas.length;
  }
  const hoy = hoyColombia();
  const json = JSON.stringify({ generado: new Date().toISOString(), fecha: hoy, tablas, omitidas });
  return { nombre: `respaldo-fondo-familiar-${hoy}.json.gz`, contenido: gzipSync(Buffer.from(json, "utf-8")), resumen, omitidas };
}

const MAXIMO_GUARDADOS = 12;

// Respaldo semanal: se guarda en el bucket privado «respaldos» (últimos 12) y se envía por correo al fiscal.
export async function respaldoSemanal() {
  const respaldo = await generarRespaldo();
  const db = clienteAdmin();

  const { error } = await db.storage.from("respaldos").upload(respaldo.nombre, respaldo.contenido, {
    contentType: "application/gzip",
    upsert: true,
  });
  if (error) throw new Error(`No se pudo guardar el respaldo: ${error.message}`);

  const { data: archivos } = await db.storage.from("respaldos").list("", { limit: 100, sortBy: { column: "name", order: "desc" } });
  const sobrantes = (archivos ?? []).slice(MAXIMO_GUARDADOS).map((a) => a.name);
  if (sobrantes.length > 0) await db.storage.from("respaldos").remove(sobrantes);

  // Copia por correo al fiscal (fuera de Supabase, por si el proyecto se pierde).
  let correos = 0;
  const clave = process.env.RESEND_API_KEY;
  if (clave) {
    const { data: fiscal } = await db.from("perfiles").select("correo").eq("rol", "fiscal").eq("activo", true);
    const from = process.env.CORREO_REMITENTE ?? "Fondo Familiar <fondo@nitro2tech.com>";
    const filas = Object.entries(respaldo.resumen).map(([t, n]) => `${t}: ${n}`).join(" · ");
    for (const f of fiscal ?? []) {
      if (!f.correo || /^socio\d+@fondofamiliar\.nitro2tech\.com$/i.test(f.correo)) continue;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [f.correo],
          subject: `Respaldo semanal del fondo (${hoyColombia()})`,
          html: `<p>Adjunto el respaldo semanal de la base de datos del Fondo Familiar.</p><p style="color:#666;font-size:12px">${filas}</p><p style="color:#666;font-size:12px">Guárdalo en un lugar seguro: contiene información privada de los asociados.</p>`,
          attachments: [{ filename: respaldo.nombre, content: respaldo.contenido.toString("base64") }],
        }),
      });
      if (res.ok) correos++;
      else console.error("Respaldo: el correo falló", res.status);
    }
  }
  return { nombre: respaldo.nombre, bytes: respaldo.contenido.length, filas: respaldo.resumen, omitidas: respaldo.omitidas, correos };
}
