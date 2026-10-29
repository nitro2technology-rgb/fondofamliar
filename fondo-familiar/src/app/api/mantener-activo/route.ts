import { NextResponse } from "next/server";
import { clienteAdmin } from "@/lib/supabase/admin";

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
  return NextResponse.json({ ok: true });
}
