import "server-only";
import { clienteAdmin } from "@/lib/supabase/admin";
import { urlFotoPerfil } from "@/lib/fotos";

// Fotos de perfil de varias personas (id -> URL). Si la columna aún no existe, devuelve vacío sin romper nada.
export async function fotosPerfil(ids: string[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>();
  if (ids.length === 0) return mapa;
  const { data, error } = await clienteAdmin().from("perfiles").select("id, foto_ruta").in("id", ids);
  if (error) return mapa;
  for (const p of data ?? []) {
    const url = urlFotoPerfil(p.foto_ruta);
    if (url) mapa.set(p.id, url);
  }
  return mapa;
}
