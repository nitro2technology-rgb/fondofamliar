import { NextResponse } from "next/server";
import { clienteAdmin } from "@/lib/supabase/admin";
import { respaldoSemanal } from "@/lib/respaldo";
import { hoyColombia } from "@/lib/format";

// Lo llama Vercel Cron una vez al día: una consulta mínima evita que Supabase (plan gratis)
// pause el proyecto por inactividad. Si CRON_SECRET está definido, Vercel lo envía como Bearer.
export async function GET(request: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && request.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { error } = await clienteAdmin().from("parametros").select("clave").limit(1);
  if (error) {
    console.error("mantener-activo: falló la consulta", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Los domingos (hora de Colombia) se hace además el respaldo semanal de la base.
  // Un fallo del respaldo no afecta la tarea de mantener activo el proyecto.
  let respaldo: unknown = null;
  if (new Date(`${hoyColombia()}T12:00:00Z`).getUTCDay() === 0) {
    try {
      respaldo = await respaldoSemanal();
    } catch (e) {
      console.error("respaldo semanal falló", e);
      respaldo = { error: e instanceof Error ? e.message : "falló" };
    }
  }
  return NextResponse.json({ ok: true, respaldo });
}
