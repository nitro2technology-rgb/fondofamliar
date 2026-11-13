import { cache } from "react";
import Avatar from "@/components/Avatar";
import { clienteAdmin } from "@/lib/supabase/admin";
import { urlFotoPerfil } from "@/lib/fotos";

// Una sola consulta por petición: nombre -> URL de la foto de perfil (solo quienes tienen foto).
export const fotosPorNombre = cache(async () => {
  const mapa = new Map<string, string>();
  const { data, error } = await clienteAdmin().from("perfiles").select("nombre, foto_ruta").not("foto_ruta", "is", null);
  if (error) return mapa;
  for (const p of data ?? []) {
    const url = urlFotoPerfil(p.foto_ruta);
    if (url) mapa.set(p.nombre, url);
  }
  return mapa;
});

// Avatar para listas del panel: busca la foto por nombre (los 19 asociados tienen nombre distinto).
export default async function AvatarSocio({ nombre, size = 44 }: { nombre: string; size?: number }) {
  const mapa = await fotosPorNombre();
  return <Avatar nombre={nombre} size={size} foto={mapa.get(nombre) ?? null} />;
}
