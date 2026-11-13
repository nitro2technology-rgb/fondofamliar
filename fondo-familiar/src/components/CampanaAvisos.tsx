import { crearClienteServidor } from "@/lib/supabase/server";
import PanelAvisos from "@/components/PanelAvisos";

// Campana de la parte de arriba: trae los últimos avisos y el número de sin leer.
export default async function CampanaAvisos({ href = "/avisos" }: { href?: string }) {
  const supabase = await crearClienteServidor();
  const [{ data }, { count }] = await Promise.all([
    supabase.from("avisos").select("id, titulo, cuerpo, url, leido, creado_en").order("creado_en", { ascending: false }).limit(8),
    supabase.from("avisos").select("id", { count: "exact", head: true }).eq("leido", false),
  ]);
  return <PanelAvisos avisos={data ?? []} sinLeer={count ?? 0} verTodos={href} />;
}
