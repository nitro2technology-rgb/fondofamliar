import "server-only";
import { crearClienteServidor } from "@/lib/supabase/server";

// Resumen de los bingos (llamar solo tras requerirAdmin).
// Recaudado = parte de juegos de las cuotas pagadas; premios = lo pagado a ganadores; lo demás queda en el fondo.
export async function resumenJuegos() {
  const supabase = await crearClienteServidor();
  const [{ data: cuotas }, { data: premios }] = await Promise.all([
    supabase.from("cuotas").select("juegos").eq("estado", "pagada"),
    supabase.from("premios_bingo").select("monto"),
  ]);
  const recaudado = (cuotas ?? []).reduce((s, c) => s + Number(c.juegos), 0);
  const pagados = (premios ?? []).reduce((s, p) => s + Number(p.monto), 0);
  return { recaudado, premios: pagados, utilidad: recaudado - pagados, cantidadPremios: premios?.length ?? 0 };
}
