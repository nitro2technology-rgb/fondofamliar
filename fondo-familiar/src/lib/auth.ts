import "server-only";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/server";

export type Perfil = {
  id: string;
  nombre: string;
  correo: string;
  rol: "asociado" | "tesorero" | "contador" | "fiscal";
};

export const esAdmin = (p: Perfil) => p.rol !== "asociado";

// Perfil del usuario con sesión; si no hay sesión o perfil activo, vuelve al login.
export async function requerirPerfil(): Promise<Perfil> {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, correo, rol")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();
  if (!data) redirect("/login?error=sin-perfil");

  return data as Perfil;
}

export async function requerirAdmin(): Promise<Perfil> {
  const perfil = await requerirPerfil();
  if (!esAdmin(perfil)) redirect("/");
  return perfil;
}
