import "server-only";
import { crearClienteServidor } from "@/lib/supabase/server";

// ¿Ya vio este usuario el tutorial de su panel? Si la columna no existe todavía, se asume que sí (no estorba).
export async function tutorialVisto(perfilId: string, panel: "asociado" | "admin") {
  const supabase = await crearClienteServidor();
  const columna = panel === "admin" ? "tutorial_admin" : "tutorial_asociado";
  const { data, error } = await supabase.from("perfiles").select(columna).eq("id", perfilId).maybeSingle();
  if (error || !data) return true;
  return Boolean((data as unknown as Record<string, boolean>)[columna]);
}
