import "server-only";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export type Perfil = {
  id: string;
  nombre: string;
  correo: string;
  rol: "asociado" | "tesorero" | "contador" | "fiscal";
  primer_ingreso_completo: boolean;
};

export const esAdmin = (p: Perfil) => p.rol !== "asociado";

async function leerPerfil(): Promise<Perfil> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, correo, rol, primer_ingreso_completo")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();
  if (!data) redirect("/login?error=sin-perfil");

  return data as Perfil;
}

// Para /completar-cuenta: exige sesión pero no que la cuenta esté completa.
export const requerirSesion = leerPerfil;

// Perfil del usuario con sesión; si aún no completó su cuenta, lo envía a completarla.
export async function requerirPerfil(): Promise<Perfil> {
  const perfil = await leerPerfil();
  if (!perfil.primer_ingreso_completo) redirect("/completar-cuenta");
  return perfil;
}

export async function requerirAdmin(): Promise<Perfil> {
  const perfil = await requerirPerfil();
  if (!esAdmin(perfil)) redirect("/");
  return perfil;
}
