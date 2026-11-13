import "server-only";
import { sendNotification, setVapidDetails } from "web-push";
import { clienteAdmin } from "@/lib/supabase/admin";

export type Aviso = { titulo: string; cuerpo: string; url?: string; tag?: string };

let configurado = false;
function configurar() {
  if (configurado) return true;
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privada = process.env.VAPID_PRIVATE_KEY;
  if (!publica || !privada) return false;
  setVapidDetails(process.env.VAPID_ASUNTO ?? "mailto:notificaciones@nitro2tech.com", publica, privada);
  configurado = true;
  return true;
}

// Guarda el aviso en la bandeja de cada persona (se ve en la campana de la app, en cualquier dispositivo).
async function guardarAvisos(ids: string[] | null, aviso: Aviso) {
  const db = clienteAdmin();
  let destinos = ids;
  if (!destinos) {
    const { data } = await db.from("perfiles").select("id").eq("activo", true);
    destinos = (data ?? []).map((p) => p.id);
  }
  if (destinos.length === 0) return;
  // Si la tabla aún no existe, simplemente no se guarda (no rompe el envío).
  await db
    .from("avisos")
    .insert(destinos.map((id) => ({ asociado_id: id, titulo: aviso.titulo, cuerpo: aviso.cuerpo, url: aviso.url ?? null })));
}

// Envía un aviso a los asociados indicados (o a todos si `ids` es null): lo guarda en su bandeja y, si activaron
// las notificaciones, lo manda como push. Borra las suscripciones que el navegador ya dio de baja. Devuelve cuántos push se enviaron.
export async function enviarPush(ids: string[] | null, aviso: Aviso): Promise<number> {
  if (ids && ids.length === 0) return 0;
  await guardarAvisos(ids, aviso).catch(() => undefined);
  if (!configurar()) return 0;
  const db = clienteAdmin();
  let consulta = db.from("push_suscripciones").select("id, asociado_id, endpoint, p256dh, auth, perfiles!inner(activo)");
  if (ids) consulta = consulta.in("asociado_id", ids);
  const { data } = await consulta;
  const subs = (data ?? []).filter((s) => (s.perfiles as unknown as { activo: boolean } | null)?.activo);
  const caducadas: string[] = [];
  let enviadas = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(aviso),
          { TTL: 60 * 60 * 12 },
        );
        enviadas++;
      } catch (e) {
        const codigo = (e as { statusCode?: number }).statusCode;
        if (codigo === 404 || codigo === 410) caducadas.push(s.id);
      }
    }),
  );
  if (caducadas.length > 0) await db.from("push_suscripciones").delete().in("id", caducadas);
  return enviadas;
}

// Avisa a los administradores (tesorero, contador, fiscal).
export async function enviarPushAdmins(aviso: Aviso) {
  const { data } = await clienteAdmin().from("perfiles").select("id").in("rol", ["tesorero", "contador", "fiscal"]).eq("activo", true);
  return enviarPush((data ?? []).map((a) => a.id), aviso);
}
