import { requerirAdmin } from "@/lib/auth";
import { generarRespaldo } from "@/lib/respaldo";

// Descarga un respaldo completo de la base (JSON comprimido) en el momento.
export async function GET() {
  await requerirAdmin();
  const r = await generarRespaldo();
  return new Response(new Uint8Array(r.contenido), {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${r.nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
