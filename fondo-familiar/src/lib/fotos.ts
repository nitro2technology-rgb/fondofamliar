// URL pública de una foto de perfil (bucket «fotos-perfil»). Sin dependencias de servidor: sirve en cliente y servidor.
export const urlFotoPerfil = (ruta: string | null | undefined) =>
  ruta ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/fotos-perfil/${ruta}` : null;
